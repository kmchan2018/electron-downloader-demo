

import { BrowserWindow, WebContents, DownloadItem, Event, Session, ipcMain } from 'electron';


//////////////////////////////////////////////////////////////////////////
//
// Operation defines an operation being executed by the driver.
//
//////////////////////////////////////////////////////////////////////////

interface Navigate {
	readonly type: 'navigate';
	readonly url: string;
	readonly resolve: Function;
	readonly reject: Function;
}

interface Download {
	readonly type: 'download';
	readonly url: string;
	readonly path: string;
	readonly resolve: Function;
	readonly reject: Function;
}

type Operation =
	Navigate |
	Download


//////////////////////////////////////////////////////////////////////////
//
// Driver implements a programatically controlled web browser so that
// its client can load and manipulate any websites.
//
//////////////////////////////////////////////////////////////////////////

class Driver {
	private session: Session;
	private browser: BrowserWindow | null;
	private operation: Operation | null;
	private on_closed: Function;
	private on_load_success: (ev: Event) => void;
	private on_load_failure: (ev: Event, code: number, desc: string, url: string, main: boolean, fpid: number, frid: number) => void;
	private on_download_started: (ev: Event, item: DownloadItem, webcontents: WebContents) => void;
	private on_download_done: (ev: Event, state: string) => void;

	constructor(session: Session) {
		this.session = session;
		this.browser = null;
		this.operation = null;
		this.on_load_success = this.handle_load_success.bind(this);
		this.on_load_failure = this.handle_load_failure.bind(this);
		this.on_download_started = this.handle_download_started.bind(this);
		this.on_download_done = this.handle_download_done.bind(this);
		this.on_closed = this.handle_closed.bind(this);
	}

	open(): Promise<void> {
		if (this.browser == null) {
			this.browser = new BrowserWindow({
				closable: false,
				webPreferences: {
					nodeIntegration: false,
					nodeIntegrationInWorker: false,
					enableRemoteModule: true,
					contextIsolation: false,
					sandbox: false,
					session: this.session,
				}
			});

			this.browser.setMenu(null);
			this.browser.setAutoHideMenuBar(true);
			this.browser.webContents.session.on('will-download', this.on_download_started);
			this.browser.webContents.on('did-finish-load', this.on_load_success);
			this.browser.webContents.on('did-fail-load', this.on_load_failure);
			this.browser.on('closed', this.on_closed);

			return Promise.resolve(undefined);
		} else {
			return Promise.resolve(undefined);
		}
	}

	navigate(url: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.browser == null) {
				reject('browser closed');
			} else if (this.operation != null) {
				reject('service busy');
			} else {
				this.operation = { type: 'navigate', url, resolve, reject };
				this.browser.webContents.loadURL(url);
			}
		});
	}

	download(url: string, path: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.browser == null) {
				reject('browser closed');
			} else if (this.operation != null) {
				reject('service busy');
			} else {
				this.operation = { type: 'download', url, path, resolve, reject };
				this.browser.webContents.downloadURL(url);
			}
		});
	}

	execute<Result>(script: string): Promise<Result> {
		if (this.browser == null) {
			return Promise.reject('browser closed');
		} else {
			return this.browser.webContents.executeJavaScript(script, false);
		}
	}

	private handle_closed() {
		if (this.operation != null) {
			this.operation.reject('browser closed');
			this.operation = null;
			this.browser = null;
		} else {
			this.browser = null;
		}
	}

	private handle_load_success(ev: Event) {
		if (this.operation != null) {
			if (this.operation.type == 'navigate') {
				this.operation.resolve(undefined);
				this.operation = null;
			}
		}
	}

	private handle_load_failure(ev: Event, code: number, description: string, url: string, main: boolean, fpid: number, frid: number) {
		if (this.operation != null) {
			if (this.operation.type == 'navigate') {
				if (main) {
					this.operation.reject(`url not loadable: ${description} (${code})`);
					this.operation = null;
				}
			}
		}
	}

	private handle_download_started(ev: Event, item: DownloadItem, webcontents: WebContents) {
		if (this.operation != null) {
			if (this.operation.type == 'download') {
				item.setSavePath(this.operation.path);
				item.once('done', this.on_download_done);
			}
		}
	}

	private handle_download_done(ev: Event, state: string) {
		if (this.operation != null) {
			if (this.operation.type == 'download') {
				if (state == 'completed') {
					this.operation.resolve(undefined);
					this.operation = null;
				} else if (state == 'cancelled') {
					this.operation.reject('download cancelled');
					this.operation = null;
				} else if (state == 'interrupted') {
					this.operation.reject('download interrupted');
					this.operation = null;
				}
			}
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Driver as default,
	Driver
}


