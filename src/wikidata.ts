import { GM_xmlhttpRequest } from "$";
import type { MBEntity } from "./mb.js";

export function findItem(kgmid: string): Promise<string | null> {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            format: "json",
            query: `SELECT ?item WHERE { ?item (wdt:P646|wdt:P2671) "${kgmid}" }`
        });

        GM_xmlhttpRequest({
            url: "https://query.wikidata.org/bigdata/namespace/wdq/sparql?" + params.toString(),
            responseType: "json",
            onload: (res) => {
                const results = res.response.results.bindings;
                if (results.length === 0) return resolve(null);
                const url = new URL(results[0].item.value);
                const id = url.pathname.split("/").at(-1) ?? null;
                resolve(id);
            }
        });
    });
}

const MB_PROPERTIES: Record<string, string> = {
    "P434": "artist",
    "P436": "release_group",
    "P982": "area",
    "P1004": "place",
    "P966": "label",
    "P435": "work",
    "P1330": "instrument",
    "P1407": "series",
    "P6423": "event",
    "P4404": "recording",
    "P5813": "release",
    "P8052": "genre"
};


export function fetchItemEntites(item: string): Promise<MBEntity[]> {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            format: "json",
            query: `SELECT ?property ?value WHERE { VALUES ?property { ${Object.keys(MB_PROPERTIES).map((p) => "wdt:" + p).join(" ")} } wd:${item} ?property ?value }`
        });

        GM_xmlhttpRequest({
            url: "https://query.wikidata.org/bigdata/namespace/wdq/sparql?" + params.toString(),
            responseType: "json",
            onload: ({ response }: { response: WikidataQuery }) => {
                const results = response.results.bindings;
                if (results.length === 0) return resolve([]);
                const entities = results.map((r): MBEntity => {
                    const property = r.property.value.split("/").at(-1) as string;
                    return {
                        id: r.value.value,
                        type: MB_PROPERTIES[property]
                    };
                });
                resolve(entities);
            }
        });
    });
}

interface WikidataQuery {
    results: WikidataResults;
}

interface WikidataResults {
    bindings: WikidataBinding[];
}

interface WikidataBinding {
    property: WikidataPair;
    value: WikidataPair;
}

interface WikidataPair {
    type: string;
    value: string;
}
