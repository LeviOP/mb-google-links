import type { MBEntity } from "./mb.js";
import { getEntities } from "./entites.js";
import { GM_xmlhttpRequest } from "$";

interface MBLink {
    element: HTMLAnchorElement;
    entities: MBEntity[];
}

export async function accumulateLinks(doc: Document): Promise<Promise<MBLink>[]> {
    console.log("accumulateLinks");
    const sidebarSections = getSidebarSections(doc);
    console.log("sidebarSections:", sidebarSections);

    const aboutSection = sidebarSections.find((section) => section.matches("div:has(> div > div > div > div > div > div > div[data-attrid])"));
    if (aboutSection === undefined) return [];

    const anchorElements = Array.from(aboutSection.querySelectorAll<HTMLAnchorElement>("a[href]"));

    const links = anchorElements.map<Promise<MBLink>>(async (element) => {
        if (element.textContent === "MORE") return { element, entities: [] }; // Hardcode new "MORE" link that just returns identical kgmid
        const url = new URL(element.href);
        if (url.hostname === "www.google.com" && url.pathname === "/search") {
            const doc = await fetchResult(element.href);
            if (doc === null) return { element, entities: [] };
            const entities = await getEntities(doc);
            return { element, entities };
        }
        return { element, entities: [] };
    });

    return links;
}

function getSidebarSections(doc: Document): Element[] {
    const sections = doc.querySelectorAll("#rhs > div:not(.focusSentinel):not(:empty)");
    if (sections.length === 1 && doc.querySelectorAll("#rhs > div > div > div > div > div > div > div > div#kp-wp-tab-overview > div, #rhs > div > div > div > div > div > div > div#kp-wp-tab-cont-overview > div > div > div").length > 0) return Array.from(doc.querySelectorAll("#rhs > div > div > div > div > div > div > div > div#kp-wp-tab-overview > div, #rhs > div > div > div > div > div > div > div#kp-wp-tab-cont-overview > div > div > div"));
    return Array.from(sections);
}

function fetchResult(url: string): Promise<Document | null> {
    return new Promise((resolve) => {
        GM_xmlhttpRequest({
            url,
            onload: ({ responseXML }) => resolve(responseXML)
        });
    });
}

export function addLinks(element: Element, entities: MBEntity[]) {
    const icons = entities.map((e) => elementFromHTML(`<a class="mb-link" href="https://musicbrainz.org/${e.type.replace("_", "-")}/${e.id}"><img src="https://musicbrainz.org/static/images/entity/${e.type}.svg"></a>`));
    icons.forEach((icon) => element.insertAdjacentElement("beforebegin", icon));
}

function elementFromHTML(html: string) {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild as Element;
}
