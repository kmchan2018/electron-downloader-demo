

interface Gallery {
	readonly type: 'gallery';
	readonly url: string;
	readonly title: string;
	readonly preview: string;
}

interface Page {
	readonly type: 'page';
	readonly url: string;
}

interface Asset {
	readonly type: 'asset';
	readonly url: string;
	readonly basename: string;
}

interface Probe {
	supports(): boolean;
	extract_gallery(): Gallery;
	extract_page_list(): Page[];
	extract_asset_list(): Asset[];
}

interface Agent {
	register(probe: Probe): void;
}

interface Window {
	agent: Agent;
}


declare function annotate<Input,Result>(extractor: (input: Input) => Result, message: string): (input: Input) => Result;
declare function chain<T,R>(first: (t: T) => R): (t: T) => R;
declare function chain<T,I,R>(first: (t: T) => I, second: (i: I) => R): (t: T) => R;
declare function chain<T,I,J,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => R): (t: T) => R;
declare function chain<T,I,J,K,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => R): (t: T) => R;
declare function chain<T,I,J,K,L,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => R): (t: T) => R;
declare function chain<T,I,J,K,L,M,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => R): (t: T) => R;
declare function chain<T,I,J,K,L,M,N,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => R): (t: T) => R;
declare function chain<T,I,J,K,L,M,N,O,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => O, eighth: (o: O) => R): (t: T) => R;
declare function chain<T,I,J,K,L,M,N,O,P,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => O, eighth: (o: O) => P, nineth: (p: P) => R): (t: T) => R;
declare function chain<T,I,J,K,L,M,N,O,P,Q,R>(first: (t: T) => I, second: (i: I) => J, third: (j: J) => K, fourth: (k: K) => L, fifth: (l: L) => M, sixth: (m: M) => N, seventh: (n: N) => O, eighth: (o: O) => P, nineth: (p: P) => Q, tenth: (q: Q) => R): (t: T) => R;
declare function either<Input,Result>(...funcs: Array<(input: Input) => Result>): (input: Input) => Result;
declare function select(selector: string): (input: Document | Element) => Element;
declare function select_all(selector: string): (input: Document | Element) => Element[];
declare function attribute(name: string): (input: Element) => string;
declare function text(): (input: Element) => string;
declare function match(regex: RegExp, group: number): (input: string) => string;
declare function ensure_not_empty(): (input: string) => string;
declare function absolutize(base: string): (input: string) => string;


