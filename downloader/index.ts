

import { createElement } from 'react';
import { render } from 'react-dom';
import { Frontend } from './frontend';


let frontend = new Frontend('downloader');
let started = false;

function start() {
	if (started == false) {
		let root = document.getElementById('downloader');
		if (root != null) {
			frontend.start();
			frontend.render(root);
			started = true;
		}
	}
}

function stop() {
	if (started == true) {
		frontend.stop();
		started = false;
	}
}

if (document.readyState != 'loading') {
	start();
	window.addEventListener('beforeunload', stop);
} else {
	document.addEventListener('load', start);
	document.addEventListener('DOMContentLoaded', start);
	window.addEventListener('beforeunload', stop);
}


export = {};


