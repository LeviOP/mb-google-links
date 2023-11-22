import { GM_addStyle } from "$";
import { getEntities } from "./entites.js";
import { accumulateLinks, addLinks } from "./links.js";

async function handleMain(doc: Document) {
    console.log("handle main");
    const entities = await getEntities(doc);
    console.log(entities);

    const possibleTitles = [
        ...doc.querySelectorAll("div[data-attrid='title'], div[data-attrid='title'] > span, h2[data-attrid='title'] > span"),
        ...doc.querySelectorAll("a:has(> div[data-attrid='title'])")
    ];
    console.log(possibleTitles);
    const element = possibleTitles.at(-1);
    console.log(element);
    if (element === undefined) return;
    addLinks(element, entities);
}

async function handleSidebar(doc: Document) {
    console.log("handle sidebar");
    const links = await accumulateLinks(doc);
    links.forEach((link) => link.then(({ element, entities }) => addLinks(element, entities)));
}

function start() {
    handleMain(document);
    handleSidebar(document);

    GM_addStyle(`
        div[data-attrid="title"] > .mb-link > img {
            height: 32px;
            margin-bottom: -5px;
        }
        div:has(> .mb-link) {
            display: contents;
        }
        div:not(:has(> div[data-attrid="title"])) > .mb-link > img, h2[data-attrid="title"] > .mb-link > img {
            height: 32px;
            margin-bottom: -7px;
        }
        div:has(> div[data-attrid="title"]) > .mb-link > img {
            height: 32px;
        }
        span > .mb-link > img {
            height: 22px;
            margin-bottom: -6px;
        }
    `);
}

start();
