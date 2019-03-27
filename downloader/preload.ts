

import { Gallery, Page, Asset } from './gallery';


//////////////////////////////////////////////////////////////////////////
//
// Type definition of probe
//
//////////////////////////////////////////////////////////////////////////

interface Probe {
	supports(): boolean;
	extract_gallery(): Gallery;
	extract_page_list(): Page[];
	extract_asset_list(): Asset[];
}


//////////////////////////////////////////////////////////////////////////
//
// Agent runs in the context of a web document. It contains a repository
// of probes and uses them to fulfill extraction requests from the driver.
//
//////////////////////////////////////////////////////////////////////////

class Agent {
	private probes: Probe[];

	constructor() {
		this.probes = [];
	}

	register(probe: Probe) {
		this.probes.push(probe);
	}

	extract_gallery(): Promise<Gallery> {
		return new Promise((resolve, reject) => {
			for (const probe of this.probes) {
				if (probe.supports()) {
					try {
						resolve(probe.extract_gallery());
					} catch (err) {
						reject(err);
					}
				}
			}

			reject(new Error('The page is not supported'));
		});
	}

	extract_page_list(): Promise<Page[]> {
		return new Promise((resolve, reject) => {
			for (const probe of this.probes) {
				if (probe.supports()) {
					try {
						resolve(probe.extract_page_list());
					} catch (err) {
						reject(err);
					}
				}
			}

			reject(new Error('The page is not supported'));
		});
	}

	extract_asset_list(): Promise<Asset[]> {
		return new Promise((resolve, reject) => {
			for (const probe of this.probes) {
				if (probe.supports()) {
					try {
						resolve(probe.extract_asset_list());
					} catch (err) {
						reject(err);
					}
				}
			}

			reject(new Error('The page is not supported'));
		});
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Annotate wraps an extractor and replace the exception message with the
// given text.
//
//////////////////////////////////////////////////////////////////////////

function annotate<Input,Result>(extractor: (input: Input) => Result, message: string): (input: Input) => Result {
	return function(input: Input): Result {
		try {
			return extractor(input);
		} catch (err) {
			throw new Error(message);
		}
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Chain multiple extractors together such that they can called in the
// given order, each receiving the result of last function output.
//
//////////////////////////////////////////////////////////////////////////

function chain<T,R>(first: (t: T) => R): (t: T) => R;
function chain<T,I,R>(first: (t: T) => I, second: (i: I) => R): (t: T) => R;
function chain<T,I,J,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => R): (t: T) => R;
function chain<T,I,J,K,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => R): (t: T) => R;
function chain<T,I,J,K,L,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => R): (t: T) => R;
function chain<T,I,J,K,L,M,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => R): (t: T) => R;
function chain<T,I,J,K,L,M,N,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => R): (t: T) => R;
function chain<T,I,J,K,L,M,N,O,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => O, eighth: (o: O) => R): (t: T) => R;
function chain<T,I,J,K,L,M,N,O,P,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => O, eighth: (o: O) => P, nineth: (p: P) => R): (t: T) => R;
function chain<T,I,J,K,L,M,N,O,P,Q,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => O, eighth: (o: O) => P, nineth: (p: P) => Q, tenth: (q: Q) => R): (t: T) => R;
function chain(first: Function, second?: Function, third?: Function, fourth?: Function, fifth?: Function, sixth?: Function, seventh?: Function, eighth?: Function, nineth?: Function, tenth?: Function): Function {
	if (typeof second == 'undefined') {
		return first;
	} else if (typeof third == 'undefined') {
		return (t: any): any => second(first(t));
	} else if (typeof fourth == 'undefined') {
		return (t: any): any => third(second(first(t)));
	} else if (typeof fifth == 'undefined') {
		return (t: any): any => fourth(third(second(first(t))));
	} else if (typeof sixth == 'undefined') {
		return (t: any): any => fifth(fourth(third(second(first(t)))));
	} else if (typeof seventh == 'undefined') {
		return (t: any): any => sixth(fifth(fourth(third(second(first(t))))));
	} else if (typeof eighth == 'undefined') {
		return (t: any): any => seventh(sixth(fifth(fourth(third(second(first(t)))))));
	} else if (typeof nineth == 'undefined') {
		return (t: any): any => eighth(seventh(sixth(fifth(fourth(third(second(first(t))))))));
	} else if (typeof tenth == 'undefined') {
		return (t: any): any => nineth(eighth(seventh(sixth(fifth(fourth(third(second(first(t)))))))));
	} else {
		return (t: any): any => tenth(nineth(eighth(seventh(sixth(fifth(fourth(third(second(first(t))))))))));
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns the first non-failure result from the
// given extractors for the input. The extractors are tried in the given
// order.
//
//////////////////////////////////////////////////////////////////////////

function either<Input,Result>(...funcs: Array<(input: Input) => Result>): (input: Input) => Result {
	return function(input: Input): Result {
		for (const func of funcs) {
			try {
				return func(input);
			} catch (err) {
				// ignore the error for now.
			}
		}

		throw new Error('all given extractors failed to return result for the input');
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns the first element matching the given
// selector from the input document/element.
//
//////////////////////////////////////////////////////////////////////////

function select(selector: string): (input: Document | Element) => Element {
	return function(input: Document | Element) {
		const result = input.querySelector(selector);
		if (result == null) {
			throw new Error('no element in the input document/element matches the given selector');
		} else {
			return result;
		}
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns all elements matching the given
// selector from the input document/element.
//
//////////////////////////////////////////////////////////////////////////

function select_all(selector: string): (input: Document | Element) => Element[] {
	return function(input: Document | Element) {
		const result = input.querySelectorAll(selector);
		if (result == null) {
			throw new Error('no element in the input document matches the given selector');
		} else if (result.length == 0) {
			throw new Error('no element in the input document matches the given selector');
		} else {
			return Array.from(result);
		}
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns the given attribute from the input
// element. Note that empty string may be returned.
//
//////////////////////////////////////////////////////////////////////////

function attribute(name: string): (input: Element) => string {
	return function(input: Element) {
		const result = input.getAttribute(name);
		if (result == null) {
			throw new Error('the given attribute does not exist under the input element');
		} else {
			return result;
		}
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns text content of the input element.
// Note that empty string may be returned.
//
//////////////////////////////////////////////////////////////////////////

function _text_impl(input: Element): string {
	if (input.textContent == null) {
		throw new Error('text content does not exist under the input element');
	} else {
		return input.textContent;
	}
}

function text(): (input: Element) => string {
	return _text_impl;
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns matches the input with the given 
// regular expression and return content of the given capture group.
//
//////////////////////////////////////////////////////////////////////////

function match(regex: RegExp, group: number): (input: string) => string {
	return function(input: string) {
		const match = regex.exec(input);
		if (match == null) {
			throw new Error('input string does not match the given regular expression');
		} else if (match.length <= group) {
			throw new Error('the given regular expression does not return the given capture group');
		} else {
			return match[group];
		}
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that returns the input when it is non-empty.
//
//////////////////////////////////////////////////////////////////////////

function _ensure_not_empty_impl(input: string): string {
	if (input == '') {
		throw new Error('the input string cannot be empty');
	} else {
		return input;
	}
}

function ensure_not_empty(): (input: string) => string {
	return _ensure_not_empty_impl;
}


//////////////////////////////////////////////////////////////////////////
//
// Return an extractor that transform the input to an absolute URL with
// the given base.
//
//////////////////////////////////////////////////////////////////////////

function absolutize(base: string): (input: string) => string {
	return function(input: string) {
		const url = new URL(input, base);
		return url.href;
	};
}


//////////////////////////////////////////////////////////////////////////
//
// Allows extra properties in window object such that variables, functions
// and classes defined here can be passed to other preload scripts.
//
//////////////////////////////////////////////////////////////////////////

declare global {
	interface Window {
		agent: Agent;
		annotate: Function;
		chain: Function;
		either: Function;
		select: Function;
		select_all: Function;
		attribute: Function;
		text: Function;
		match: Function;
		ensure_not_empty: Function;
		absolutize: Function;
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Main Script
//
//////////////////////////////////////////////////////////////////////////

(function() {
	window.agent = new Agent();
	window.annotate = annotate;
	window.chain = chain;
	window.either = either;
	window.select = select;
	window.select_all = select_all;
	window.attribute = attribute;
	window.text = text;
	window.match = match;
	window.ensure_not_empty = ensure_not_empty;
	window.absolutize = absolutize;
	console.log("Done loading downloader/preload.js");
})();

export = {};


