

import * as Fs from 'fs';
import * as Path from 'path';
import * as URL from 'url';

import { OnBeforeRequestDetails, Response, app, webContents } from 'electron';
import { AdBlockClient, FilterOptions } from 'ad-block';


//////////////////////////////////////////////////////////////////////////
//
// AdBlocker manages the adblock subsystem by handling the loading and
// caching of filter rules and user data.
//
//////////////////////////////////////////////////////////////////////////

class AdBlocker {
	private root_path: string;
	private list_path: string;
	private cache_path: string;
	private client: AdBlockClient | null;
	private busy: boolean;

	constructor() {
		this.root_path = Path.join(app.getPath('userData'), 'adblock');
		this.list_path = Path.join(this.root_path, 'lists');
		this.cache_path = Path.join(this.root_path, 'cache.dat');
		this.client = null;
		this.busy = false;
	}

	async load() {
		if (this.client == null) {
			try {
				this.client = await this.from_cache();
			} catch (err) {
				try {
					this.busy = true;
					this.client = await this.from_lists();
					await this.dump_cache(this.client);
					this.busy = false;
				} catch (err) {
					this.busy = false;
				}
			}
		}
	}

	async rebuild() {
		if (this.client != null) {
			if (this.busy == false) {
				this.busy = true;

				try {
					this.client = await this.from_lists();
					await this.dump_cache(this.client);
					this.busy = false;
				} catch (err) {
					this.busy = false;
				}
			}
		}
	}

	test(details: OnBeforeRequestDetails): boolean {
		if (this.client != null) {
			const type = this.derive_type(details);
			const domain = this.derive_domain(details);
			const cancel = this.client.matches(details.url, type, domain);
			return cancel;
		} else {
			return false;
		}
	}

	handle_before_request(details: OnBeforeRequestDetails, callback: (response: Response) => void) {
		callback({ cancel: this.test(details) });
	}

	private from_lists(): Promise<AdBlockClient> {
		return new Promise<AdBlockClient>((resolve, reject) => {
			Fs.readdir(this.list_path, { withFileTypes: true }, (error, entries) => {
				if (error == null) {
					let client = new AdBlockClient();
					let promises = [];

					for (const entry of entries) {
						if (entry.name == '.') continue;
						if (entry.name == '..') continue;
						if (entry.isFile() == false) continue;
						
						let path = Path.join(this.list_path, entry.name);
						let stream = Fs.createReadStream(path, 'utf8');
						let leftover = '';

						promises.push(new Promise<void>((resolve, reject) => {
							stream.once('close', resolve);
						}));

						stream.on('data', (data: string) => {
							const lines = (leftover + data).split(/(\r|\n|\r\n)/);
							leftover = lines[lines.length - 1];
							for (const line of lines.slice(0, -1)) {
								client.parse(line);
							}
						});

						stream.on('end', () => {
							if (leftover != '') {
								client.parse(leftover);
							}
						});
					}

					Promise.all(promises).then(
						resolve.bind(null, client),
						reject
					);
				} else {
					reject(error);
				}
			});
		});
	}

	private from_cache(): Promise<AdBlockClient> {
		return new Promise<AdBlockClient>((resolve, reject) => {
			Fs.readFile(this.cache_path, (error, buffer) => {
				if (error == null) {
					const client = new AdBlockClient();
					client.deserialize(buffer);
					resolve(client);
				} else {
					reject(error);
				}
			});
		});
	}

	private dump_cache(client: AdBlockClient): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const buffer = client.serialize();
			Fs.writeFile(this.cache_path, buffer, (error) => {
				if (error == null) {
					resolve();
				} else {
					reject(error);
				}
			});
		});
	}

	private derive_domain(details: OnBeforeRequestDetails): string {
		if (typeof details.webContentsId != 'undefined') {
			try {
				const contents = webContents.fromId(details.webContentsId);
				const url = new URL.URL(contents.getURL());
				return url.hostname;
			} catch (err) {
				return '';
			}
		} else {
			return '';
		}
	}

	private derive_type(details: OnBeforeRequestDetails): any {
		switch (details.resourceType) {
			case 'mainFrame': return FilterOptions.document;
			case 'subFrame': return FilterOptions.subdocument;
			case 'stylesheet': return FilterOptions.stylesheet;
			case 'script': return FilterOptions.script;
			case 'image': return FilterOptions.image;
			case 'object': return FilterOptions.objectSubrequest;
			case 'xhr': return FilterOptions.xmlHttpRequest;
			case 'others': return FilterOptions.other;
			default: return FilterOptions.other;
		}
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	AdBlocker as Default,
	AdBlocker
}


