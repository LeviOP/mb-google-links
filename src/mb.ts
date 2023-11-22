import { GM_xmlhttpRequest } from "$";

export async function findLinkedEntities(doc: Document): Promise<MBEntity[]> {
    const listenUrlEntities = await findLinkedListenUrl(doc);
    if (listenUrlEntities.length !== 0) return listenUrlEntities;
    const officalSiteUrl = doc.querySelector<HTMLAnchorElement>("a[data-attrid='visit_official_site']")?.href;
    if (officalSiteUrl !== undefined) {
        const id = await searchURL(officalSiteUrl);
        if (id === null) return [];
        const entities = await getEntitiesFromURL(id);
        return entities;
    }
    return [];
}

const STREAMING_HOSTNAMES: Record<string, (url: URL) => string> = {
    "open.spotify.com": (u: URL): string => u.origin + u.pathname
};

async function findLinkedListenUrl(doc: Document): Promise<MBEntity[]> {
    const streamingElements = doc.querySelectorAll<HTMLAnchorElement>("[data-attrid^='action:listen'] > div > div > div > div > div > a");
    if (streamingElements === null) return [];
    const urls = Array.from(streamingElements).map((e) => e.href);
    const links = urls.reduce<string[]>((prev, curr) => {
        const url = new URL(curr);
        const hostname = url.hostname;
        if (Object.keys(STREAMING_HOSTNAMES).includes(hostname)) return [...prev, STREAMING_HOSTNAMES[hostname](url)];
        return prev;
    }, []);
    const entities = await Promise.all(links.map<Promise<MBEntity[]>>(async (link) => {
        const id = await searchURL(link);
        if (id === null) return [];
        const entities = await getEntitiesFromURL(id);
        return entities;
    }));
    return entities.flat();
}

function searchURL(string: string): Promise<string | null> {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            fmt: "json",
            query: string,
            limit: "1"
        });

        GM_xmlhttpRequest({
            url: "https://musicbrainz.org/ws/2/url/?" + params.toString(),
            responseType: "json",
            onload: ({ response }) => {
                const mburl = response.urls[0];
                if (mburl.score !== 100) return resolve(null);
                const url = new URL(mburl.resource);
                const searchUrl = new URL(string);
                if (url.hostname !== searchUrl.hostname) return resolve(null);
                resolve(mburl.id);
            }
        });
    });
}

async function getEntitiesFromURL(id: string) {
    const url = await fetchURL(id);
    const entities = await Promise.all(url.relations.map<Promise<MBEntity>>(async (relationship) => {
        const type = relationship["target-type"];
        const id = relationship[type].id;
        if (type === "release") {
            const releaseGroup = await getReleaseGroupFromRelease(id);
            return { id: releaseGroup, type: "release_group" };
        }
        return { id, type };
    }));
    return entities;
}

interface MBAPIUrlSearchResponse {
    relations: MBAPISearchRelationship[];
}

interface MBAPISearchRelationship {
    "target-type": string;
}

function fetchURL(id: string): Promise<MBAPIUrlSearchResponse> {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            fmt: "json",
            inc: "area-rels+artist-rels+event-rels+instrument-rels+label-rels+place-rels+recording-rels+release-rels+release-group-rels+series-rels+url-rels+work-rels"
        });

        console.log(`https://musicbrainz.org/ws/2/url/${id}?${params.toString()}`);
        GM_xmlhttpRequest({
            url: `https://musicbrainz.org/ws/2/url/${id}?${params.toString()}`,
            responseType: "json",
            onload: ({ response }) => {
                resolve(response);
            }
        });
    });
}

function getReleaseGroupFromRelease(id: string): Promise<string | null> {
    return new Promise((resolve) => {
        const params = new URLSearchParams({
            fmt: "json",
            inc: "release-groups"
        });

        GM_xmlhttpRequest({
            url: `https://musicbrainz.org/ws/2/release/${id}?${params.toString()}`,
            responseType: "json",
            onload: ({ response: json }) => {
                const group = json["release-group"];
                if (group === undefined) return resolve(null);
                resolve(group.id);
            }
        });
    });
}

export interface MBEntity {
    id: string;
    type: string;
}
