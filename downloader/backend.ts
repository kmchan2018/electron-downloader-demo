

import * as Console from 'console';
import * as Fs from 'fs';
import * as Path from 'path';
import * as Util from 'util';
import { BrowserWindow, BrowserWindowConstructorOptions, Event, Menu, MenuItemConstructorOptions, Session, WebContents, app, ipcMain, session } from 'electron';

import * as Repository from './repository';
import * as Queue from './queue';
import * as Gallery from './gallery';
import * as Action from './action';
import * as Driver from './driver';
import * as AdBlocker from '../common/adblocker';


//////////////////////////////////////////////////////////////////////////
//
// State of the backend subsystem.
//
//////////////////////////////////////////////////////////////////////////

interface State {
	repository: Repository.Repository;
	queue: Queue.Queue;
}

interface Store {
	state: State | null;
}


//////////////////////////////////////////////////////////////////////////
//
// Opener for downloader window.
//
//////////////////////////////////////////////////////////////////////////

class Opener {
	private channel: string;
	private app_session: Session;
	private web_session: Session;

	constructor(channel: string, app_session: Session, web_session: Session) {
		this.channel = channel;
		this.app_session = app_session;
		this.web_session = web_session;
	}

	frontend(): BrowserWindow {
		let output = new BrowserWindow(Opener.frontend_window_options(this.app_session));
		output.setMenu(Menu.buildFromTemplate(Opener.frontend_window_menu()));
		output.loadFile(Path.join(__dirname, 'index.html'));
		return output;
	}

	private static frontend_window_options(session: Session): BrowserWindowConstructorOptions {
		return {
			title: 'Downloader',
			minWidth: 600,
			minHeight: 800,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				nodeIntegrationInWorker: true,
				enableRemoteModule: true,
				backgroundThrottling: false,
				contextIsolation: false,
				sandbox: false,
				session: session,
			}
		};
	}

	private static frontend_window_menu(): MenuItemConstructorOptions[] {
		return [{
			label: 'File',
			submenu: [
				{ type: 'normal', role: 'close' },
				{ type: 'normal', role: 'quit' },
			]
		}, {
			role: 'editMenu',
		}, {
			label: 'View',
			submenu: [
				{ type: 'normal', role: 'reload' },
			]
		}];
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Mailbox receives and queues incoming messages from an IPC channel for 
// processing.
//
//////////////////////////////////////////////////////////////////////////

class Mailbox {
	private queue: Array<[Action.Action, WebContents]>;
	private resolve: Function | null;

	constructor(channel: string) {
		this.queue = [];
		this.resolve = null;
		ipcMain.on(channel, this.handle_action.bind(this));
	}

	receive(): Promise<[Action.Action, WebContents]> {
		return new Promise<[Action.Action, WebContents]>((resolve, reject) => {
			if (this.queue.length > 0) {
				resolve(this.queue.shift());
			} else {
				this.resolve = resolve;
			}
		});
	}

	private handle_action(e: Event, action: Action.Action) {
		if (this.resolve != null) {
			const resolve = this.resolve;
			this.resolve = null;
			resolve([ action, e.sender ]);
		} else {
			this.queue.push([action, e.sender ]);
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Frontends tracks active frontend that the backend is aware of.
//
//////////////////////////////////////////////////////////////////////////

class Frontends {
	private channel: string;
	private frontends: WebContents[];

	constructor(channel: string) {
		this.channel = channel;
		this.frontends = [];
	}

	includes(contents: WebContents): boolean {
		return this.frontends.includes(contents);
	}

	insert(contents: WebContents) {
		if (this.frontends.length == 0) {
			this.frontends.push(contents);
		} else if (this.frontends.includes(contents) == false) {
			this.frontends.push(contents);
		}
	}

	remove(contents: WebContents) {
		if (this.frontends.length > 0) {
			this.frontends = this.frontends.filter(item => item != contents);
		}
	}

	broadcast(action: Action.Action) {
		if (this.frontends.length > 0) {
			for (const frontend of this.frontends) {
				try {
					frontend.send(this.channel, action);
				} catch (err) {
					// ignore any error during delivery
				}
			}
		}
	}

	gossip(contents: WebContents, action: Action.Action) {
		if (this.frontends.length > 0) {
			if (this.frontends[this.frontends.length - 1] === contents) {
				contents.send(this.channel, action);
			} else if (this.frontends[0] === contents) {
				contents.send(this.channel, action);
			} else if (this.frontends.includes(contents)) {
				contents.send(this.channel, action);
			}
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Service handles incoming commands to the backend.
//
//////////////////////////////////////////////////////////////////////////

class Service {
	private store: Store;
	private mailbox: Mailbox;
	private frontends: Frontends;
	private driver: Driver.Driver;

	constructor(store: Store, mailbox: Mailbox, frontends: Frontends, driver: Driver.Driver) {
		this.store = store;
		this.mailbox = mailbox;
		this.frontends = frontends;
		this.driver = driver;
	}

	async run(cancelled: () => boolean) {
		while (cancelled() == false) {
			try {
				const [ action, origin ] = await this.mailbox.receive();
	
				if (action.type == 'frontend_stopped') {
					this.frontends.remove(origin);
				} else if (action.type == 'frontend_started') {
					if (this.frontends.includes(origin) == false) {
						if (this.store.state == null) {
							this.frontends.insert(origin);
						}	else {
							this.frontends.insert(origin);
							this.frontends.gossip(origin, { type: 'backend_started', repository: this.store.state.repository });
						}
					}
				}
	
				if (this.store.state !== null) {
					let time = Date.now().valueOf();
					let updates = [] as Repository.Update[];

					if (action.type == 'start_extract_gallery') {
						await this.handle_start_extract_gallery(action);
					} else if (action.type == 'submit_download') {
						updates = Repository.submit(this.store.state.repository, action.download, time);
					} else if (action.type == 'pause_task') {
						updates = Repository.pause(this.store.state.repository, action.task, time);
					} else if (action.type == 'resume_task') {
						updates = Repository.resume(this.store.state.repository, action.task, time);
					} else if (action.type == 'cancel_task') {
						updates = Repository.cancel(this.store.state.repository, action.task, time);
					} else if (action.type == 'repeat_command') {
						updates = Repository.repeat(this.store.state.repository, action.task, action.command, time);
					}
	
					if (updates.length > 0) {
						const repository = updates.reduce(Repository.apply, this.store.state.repository);
						const queue = updates.reduce(Queue.apply, this.store.state.queue);
						this.store.state.repository = repository;
						this.store.state.queue = queue;
						this.frontends.broadcast({ type: 'repository_update', updates });
					}
				}
			} catch (err) {
				// press on
			}
		}
	}

	private async handle_start_extract_gallery(action: Action.StartExtractGallery) {
		const url = action.url;

		try {
			await this.driver.open();
			await this.driver.navigate(url);

			try {
				const script = 'agent.extract_gallery()';
				const gallery = await this.driver.execute<Gallery.Gallery>(script);
				this.frontends.broadcast({ type: 'finish_extract_gallery', url, gallery });
			} catch (err) {
				if (err instanceof Error) {
					const cause = err.message;
					this.frontends.broadcast({ type: 'fail_extract_gallery', url, cause });
				} else {
					const cause = "Gallery cannot be found due to unknown error";
					this.frontends.broadcast({ type: 'fail_extract_gallery', url, cause });
				}
			}
		} catch (err) {
			if (typeof err == 'string') {
				const cause = err;
				this.frontends.broadcast({ type: 'fail_extract_gallery', url, cause });
			} else if (typeof err == 'object' && err instanceof Error) {
				const cause = err.message;
				this.frontends.broadcast({ type: 'fail_extract_gallery', url, cause });
			} else {
				const cause = "Gallery cannot be found due to unknown error";
				this.frontends.broadcast({ type: 'fail_extract_gallery', url, cause });
			}
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Crawler executes commands in the repository and in the process walk
// around the web and scrape data there.
//
//////////////////////////////////////////////////////////////////////////

class Crawler {
	private store: Store;
	private frontends: Frontends;
	private driver: Driver.Driver;

	constructor(store: Store, frontends: Frontends, driver: Driver.Driver) {
		this.store = store;
		this.frontends = frontends;
		this.driver = driver;
	}

	async run(cancelled: () => boolean) {
		while (cancelled() == false) {
			if (this.store.state != null) {
				for (const task of this.store.state.queue.tasks) {
					for (const command of this.store.state.queue.commands[task]) {
						const download = this.store.state.repository[task];
						const operation = download.commands[command];
						const time = Date.now().valueOf();
						const updates = Repository.launch(this.store.state.repository, task, command, time);
						const repository = updates.reduce(Repository.apply, this.store.state.repository);
						const queue = updates.reduce(Queue.apply, this.store.state.queue);

						this.store.state.repository = repository;
						this.store.state.queue = queue;
						this.frontends.broadcast({ type: 'repository_update', updates });

						if (operation.type == 'visit') {
							await this.execute_visit(task, command, download, operation);
							break;
						} else if (operation.type == 'save') {
							await this.execute_save(task, command, download, operation);
							break;
						}
					}
				}
			}

			await wait(3000);
		}
	}

	private async execute_visit(task: string, command: string, download: Repository.Download, visit: Repository.Visit) {
		if (this.store.state != null) {
			try {
				let followups = [] as Repository.Operation[];

				Console.log(`[Backend/Crawl]: Start visiting ${visit.url} for task ${task} command ${command}`);
				await this.driver.open();
				await this.driver.navigate(visit.url);
				Console.log(`[Backend/Crawl]: Finish visiting ${visit.url} for task ${task} command ${command}`);

				try {
					const script = `agent.extract_page_list()`;
					const pages = await this.driver.execute<Gallery.Page[]>(script);
					const visits = pages.map(page => ({ type: 'visit', url: page.url } as Repository.Visit));
					followups.push(...visits);
				} catch (err) {
					// ignore error for not finding any pages
				}

				try {
					const script = `agent.extract_asset_list()`;
					const assets = await this.driver.execute<Gallery.Asset[]>(script);
					const saves = assets.map(asset => ({ type: 'save', url: asset.url, path: Path.join(download.path, asset.basename) } as Repository.Save));
					followups.push(...saves);
				} catch (err) {
					// ignore error for not finding any assets
				}

				const time = Date.now().valueOf();
				const updates = Repository.finish(this.store.state.repository, task, command, followups, time);
				const repository = updates.reduce(Repository.apply, this.store.state.repository);
				const queue = updates.reduce(Queue.apply, this.store.state.queue);
				this.store.state.repository = repository;
				this.store.state.queue = queue;
				this.frontends.broadcast({ type: 'repository_update', updates });

			} catch (err) {
				Console.log(`[Backend/Crawl]: Fail visiting ${visit.url} for task ${task} command ${command}: ${err}`);

				const time = Date.now().valueOf();
				const updates = Repository.reschedule(this.store.state.repository, task, command, time);
				const repository = updates.reduce(Repository.apply, this.store.state.repository);
				const queue = updates.reduce(Queue.apply, this.store.state.queue);
				this.store.state.repository = repository;
				this.store.state.queue = queue;
				this.frontends.broadcast({ type: 'repository_update', updates });
			}
		}
	}

	private async execute_save(task: string, command: string, download: Repository.Download, save: Repository.Save) {
		if (this.store.state != null) {
			try {
				Console.log(`[Backend/Crawl]: Start saving ${save.url} for task ${task} command ${command}`);
				await this.driver.open();
				await this.driver.download(save.url, save.path);
				Console.log(`[Backend/Crawl]: Finish saving ${save.url} for task ${task} command ${command}`);

				const time = Date.now().valueOf();
				const updates = Repository.finish(this.store.state.repository, task, command, [], time);
				const repository = updates.reduce(Repository.apply, this.store.state.repository);
				const queue = updates.reduce(Queue.apply, this.store.state.queue);
				this.store.state.repository = repository;
				this.store.state.queue = queue;
				this.frontends.broadcast({ type: 'repository_update', updates });

			} catch (err) {
				Console.log(`[Backend/Crawl]: Fail saving ${save.url} for task ${task} command ${command}: ${err}`);

				const time = Date.now().valueOf();
				const updates = Repository.reschedule(this.store.state.repository, task, command, time);
				const repository = updates.reduce(Repository.apply, this.store.state.repository);
				const queue = updates.reduce(Queue.apply, this.store.state.queue);
				this.store.state.repository = repository;
				this.store.state.queue = queue;
				this.frontends.broadcast({ type: 'repository_update', updates });
			}
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Filer is responsible for persisting and loading states from on-disk
// storage.
//
//////////////////////////////////////////////////////////////////////////

class Filer {
	private store: Store;
	private downloader_dir: string;
	private repository_file: string;

	constructor(store: Store) {
		this.store = store;
		this.downloader_dir = Path.join(app.getPath('userData'), 'downloader');
		this.repository_file = Path.join(this.downloader_dir, 'repository.json');
	}

	async load() {
		if (this.store.state == null) {
			await this.ensure_dir(this.downloader_dir);

			try {
				const repository = JSON.parse(await this.read_text(this.repository_file)) as Repository.Repository;
				const queue = Queue.queue(repository);
				this.store.state = { repository, queue };
			} catch (err) {
				const repository = {} as Repository.Repository;
				const queue = Queue.queue(repository);
				this.store.state = { repository, queue };
			}
		}
	}

	async synchronize(cancelled: () => boolean) {
		let past = null as Repository.Repository | null;

		while (cancelled() == false) {
			if (this.store.state != null && this.store.state.repository != past) {
				const data = JSON.stringify(this.store.state.repository);
				past = this.store.state.repository;
				await this.ensure_dir(this.downloader_dir);
				await this.write_text(this.repository_file, data);
			}

			await wait(30000);
		}
	}

	async flush() {
		if (this.store.state != null) {
		}
	}

	private ensure_dir(path: string): Promise<undefined> {
		return new Promise<undefined>((resolve, reject) => {
			Fs.mkdir(path, { recursive: true }, (err) => {
				if (err == null) {
					resolve(undefined);
				} else {
					Fs.access(path, Fs.constants.F_OK, (err) => {
						if (err == null) {
							resolve(undefined);
						} else {
							reject(err);
						}
					});
				}
			});
		});
	}

	private read_text(path: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			Fs.readFile(path, { encoding: 'utf8' }, (err, result) => {
				if (err !== null) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	}

	private write_text(path: string, data: string): Promise<undefined> {
		return new Promise<undefined>((resolve, reject) => {
			Fs.writeFile(path, data, { encoding: 'utf8' }, (err) => {
				if (err !== null) {
					reject(err);
				} else {
					resolve(undefined);
				}
			});
		});
	}
}


//////////////////////////////////////////////////////////////////////////
//
// PluginInjector is responsible for injecting plugins into web pages via
// session preloads.
//
//////////////////////////////////////////////////////////////////////////

class PluginInjector {
	private core_file: string;
	private app_directory: string;
	private user_directory: string;
	private session: Session

	constructor(session: Session) {
		this.core_file = Path.join(__dirname, 'preload.js');
		this.app_directory = Path.join(__dirname, 'plugins');
		this.user_directory = Path.join(app.getPath('userData'), 'downloader', 'plugins');
		this.session = session;
	}

	async inject() {
		this.session.setPreloads([
			this.core_file,
			...(await this.walk(this.app_directory)),
			...(await this.walk(this.user_directory)),
		]);
	}

	private walk(directory: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			Fs.readdir(directory, { withFileTypes: true }, (err, result) => {
				if (err == null) {
					let output = [] as string[];

					for (const entry of result) {
						if (entry.isFile() == false) {
							continue;
						} else if (entry.name.endsWith('.js') == false) {
							continue;
						} else {
							output.push(Path.join(directory, entry.name));
						}
					}

					resolve(output);
				} else {
					resolve([]);
				}
			});
		});
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Task represents a asynchronously running operation like promise, but
// with ability to cancel the execution.
//
//////////////////////////////////////////////////////////////////////////

class Task<T> extends Promise<T> {
	constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void, cancelled: () => boolean) => void) {
		let cancelled = false;
		super((resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void => executor(resolve, reject, () => cancelled));
		this.cancel = () => { cancelled = false; };
		this.cancelled = () => { return cancelled; };
	}

	cancelled() {
		// dummy implementation to be replaced in constructor
		return false;
	}

	cancel() {
		// dummy implementation to be replaced in constructor
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Backend
//
//////////////////////////////////////////////////////////////////////////

class Backend {
	private app_session: Session;
	private web_session: Session;
	private store: Store;
	private mailbox: Mailbox;
	private frontends: Frontends;
	private service: Service;
	private crawler: Crawler;
	private filer: Filer;
	private opener: Opener;
	private injector: PluginInjector;
	private blocker: AdBlocker.AdBlocker;
	private started: boolean;

	constructor(channel: string, app_partition: string, web_partition: string, blocker: AdBlocker.AdBlocker) {
		this.app_session = session.fromPartition(app_partition);
		this.web_session = session.fromPartition(web_partition);
		this.store = { state: null };
		this.mailbox = new Mailbox(channel);
		this.frontends = new Frontends(channel);
		this.service = new Service(this.store, this.mailbox, this.frontends, new Driver.Driver(this.web_session));
		this.crawler = new Crawler(this.store, this.frontends, new Driver.Driver(this.web_session));
		this.filer = new Filer(this.store);
		this.opener = new Opener(channel, this.app_session, this.web_session);
		this.injector = new PluginInjector(this.web_session);
		this.blocker = blocker;
		this.started = false;

		this.web_session.setUserAgent(mockUserAgent(this.web_session.getUserAgent()));
		this.web_session.webRequest.onBeforeRequest(blocker.handle_before_request.bind(blocker));
	}

	frontend(): BrowserWindow {
		return this.opener.frontend();
	}

	start(): Task<boolean> {
		return new Task((resolve, reject, cancelled) => {
			this.run(cancelled).then(resolve, reject);
		});
	}

	private async run(cancelled: () => boolean) {
		if (this.started == false) {
			this.started = true;
			this.store.state = null;

			let initializer1 = this.filer.load();
			let initializer2 = this.injector.inject();
			let initializer3 = this.blocker.load();
			let looper1 = this.service.run(cancelled);

			await Promise.all([ initializer1, initializer2 ]);

			let looper2 = this.crawler.run(cancelled);
			let looper3 = this.filer.synchronize(cancelled);

			await Promise.all([ looper1, looper2, looper3 ]);

			let finalizer1 = this.filer.flush();

			await Promise.all([ initializer3, finalizer1 ]);

			this.store.state = null;
			this.started = false;

			return true;
		} else {
			throw new Error('backend already running');
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Helper function to return a promise that resolves after the specified
// timeout. It is useful for waiting in an async function.
//
//////////////////////////////////////////////////////////////////////////

function wait(timeout: number): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(undefined), timeout);
	});
}


//////////////////////////////////////////////////////////////////////////
//
// Helper function to drive a chrome useragent from a electron useragent.
// It is used to masquerade the downloader as genuine chrome browser.
//
//////////////////////////////////////////////////////////////////////////

function mockUserAgent(original: string): string {
	const regex1 = /^Mozilla\/\d\.\d \([^\)]+\) AppleWebKit\/(\d+\.\d+) \(KHTML, like Gecko\)/;
	const regex2 = /Chrome\/(\d+(?:\.\d+)+)/;
	const match1 = regex1.exec(original);
	const match2 = regex2.exec(original);

	if (match1 == null) {
		return original;
	} else if (match1.length < 2) {
		return original;
	} else if (match2 == null) {
		return original;
	} else if (match2.length < 2) {
		return original;
	} else {
		let fragments = [match1[0]];
		fragments.push(" Chrome/");
		fragments.push(match2[1]);
		fragments.push(" Safari/");
		fragments.push(match1[1]);
		return fragments.join('');
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Backend as default,
	Backend
}


