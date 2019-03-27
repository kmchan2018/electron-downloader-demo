

import * as Path from 'path';
import { app } from 'electron';

import { AdBlocker } from './common/adblocker';
import { Backend } from './downloader/backend';


const channel = 'downloader';
const app_partition = 'downloader.app';
const web_partition = 'downloader.web';
const portal = Path.join(__dirname, 'downloader', 'index.html');
const preload = Path.join(__dirname, 'downloader', 'preload.js');
const agent = 'agent';


app.on('ready', function() {
	let adblocker = new AdBlocker();
	let backend = new Backend(channel, app_partition, web_partition, adblocker);
	let browser = backend.frontend();
	let execution = backend.start();

	browser.on('ready-to-show', function() {
		browser.show();
	});

	browser.on('closed', function() {
		execution.cancel();
	});

	execution.then(function() {
		app.quit();
	});
});


app.on('window-all-closed', function() {
	app.quit();
});


