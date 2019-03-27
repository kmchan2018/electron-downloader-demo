

(function() {

	class PluginProbe {
		supports(): boolean {
			try {
				select('div.mainbox.viewthread div.postmessage')(document);
				return true;
			} catch (err) {
				return false;
			}
		}

		extract_gallery(): Gallery {
			const title_extractor = chain(
				annotate(select('div.mainbox.viewthread h1'), "The page lacks header element"),
				annotate(text(), "The header element lacks any header text"),
				annotate(ensure_not_empty(), "The header text cannot be empty")
			);

			const url = document.documentURI;
			const title = title_extractor(document);
			const preview = '';
			return { type: 'gallery', url, title, preview };
		}

		extract_page_list(): Page[] {
			const next_extractor = chain(
				annotate(select('div.pages > a.next'), "dummy"),
				annotate(attribute('href'), "The next link element lacks the href attribute"),
				annotate(ensure_not_empty(), "The href attribute cannot be empty"),
				annotate(absolutize(document.documentURI), "The href attribute is not a valid URL")
			);

			try {
				const url = next_extractor(document);
				const page = { type: 'page', url } as Page;
				return [ page ];
			} catch (err) {
				if ((err instanceof Error) == false) {
					throw err;
				} else if (err.message != "dummy") {
					throw err;
				} else {
					throw new Error("The page lacks page information");
				}
			}
		}

		extract_asset_list(): Asset[] {
			const img_extractor = chain(
				annotate(select_all('div.mainbox.viewthread div.postmessage *[id^="postmessage_"] img'), "The page lacks the full image element")
			);

			const url_extractor = chain(
				annotate(attribute('src'), "The full image element lacks the src attribute"),
				annotate(ensure_not_empty(), "The src attribute cannot be empty"),
				annotate(absolutize(document.documentURI), "The src attribute is not a valid URL")
			);

			const basename_extractor = chain(
				annotate(match(/([^\/]+\.(?:bmp|gif|jpeg|jpg|png))$/, 1), "The URL lacks the basename in its path component") 
			);

			try {
				let output = [] as Asset[];

				for (const img of img_extractor(document)) {
					const url = url_extractor(img);
					const basename = basename_extractor(url);
					const asset = { type: 'asset', url, basename } as Asset;
					output.push(asset);
				}

				if (output.length > 0) {
					return output;
				} else {
					throw new Error("The page lacks asset information");
				}
			} catch (err) {
				throw err;
			}
		}
	}

	window.agent.register(new PluginProbe());
	console.log("Done loading downloader/plugins/discuz.js");

})();


