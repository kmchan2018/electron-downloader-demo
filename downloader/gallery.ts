

//////////////////////////////////////////////////////////////////////////
//
// Gallery represents a collection of pages and assets that can be scraped
// and downloaded. A gallery is expected to have a landing page with links
// to all other pages and assets in the gallery, directly or indirectly.
//
// The `url` specifies the URL of the landing page; the `title` field
// specifies the human-readable name of the gallery; and finally, the
// `preview` field specifies the URL to the gallery preview image.
//
//////////////////////////////////////////////////////////////////////////

interface Gallery {
	readonly type: 'gallery';
	readonly url: string;
	readonly title: string;
	readonly preview: string;
}


//////////////////////////////////////////////////////////////////////////
//
// Page represents an individual web page in a gallery which may link to
// other pages and assets in the same gallery.
//
// The `url` field specifies the URL of the page.
//
//////////////////////////////////////////////////////////////////////////

interface Page {
	readonly type: 'page';
	readonly url: string;
}


//////////////////////////////////////////////////////////////////////////
//
// Asset represents an individual media file in a gallery which can be
// downloaded and saved.
//
// The `url` field specifies the URL of the asset; the `basename` field
// specifies the proper file name of the asset.
//
//////////////////////////////////////////////////////////////////////////

interface Asset {
	readonly type: 'asset';
	readonly url: string;
	readonly basename: string;
}


//////////////////////////////////////////////////////////////////////////
//
// Exports
//
//////////////////////////////////////////////////////////////////////////

export {
	Gallery,
	Page,
	Asset
}


