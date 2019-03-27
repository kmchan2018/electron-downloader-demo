

declare module 'ad-block' {

	export class AdBlockClient {
		constructor();
		parse(rules: string): void;
		matches(url: string, options: number, origin: string): boolean;
		serialize(): Buffer;
		deserialize(buffer: Buffer): boolean;
	}

	export class FilterOptions {
		static 'noFilterOption': number;
		static 'script': number;
		static 'image': number;
		static 'stylesheet': number;
		static 'object': number;
		static 'xmlHttpRequest': number;
		static 'objectSubrequest': number;
		static 'subdocument': number;
		static 'document': number;
		static 'other': number;
		static 'xbl': number;
		static 'collapse': number;
		static 'doNotTrack': number;
		static 'elemHide': number;
		static 'thirdParty': number;
		static 'notThirdParty': number;
		static 'ping': number;
		static 'popup': number;
		static 'font': number;
		static 'media': number;
		static 'webrtc': number;
		static 'empty': number;
		static 'websocket': number;
	}

}


