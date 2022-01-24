import expressLoader from './express.mjs';
import modsLoader from './mods.mjs';
import menuLoader from './menu.mjs';
import dataLoader from './data.mjs';
import serviceLoader from '../services/serviceRoot.mjs';
import SearchQueryParser from "searchqueryparser";

export default async ({ expressApp, mode, config }) => {
  console.log(`Starting in mode: ${mode}`)
  global.sitecore_mode = mode;

  if(mode != "www"){
    await (new SearchQueryParser()).init()
  }

  await modsLoader({ app: expressApp, mode, config });
  await menuLoader({ app: expressApp, mode, config });

  await expressLoader({ app: expressApp, mode, config });
  
  if(mode != "www"){
    await dataLoader({ app: expressApp, mode, config });
    await serviceLoader();
  }
  
  console.log("Server ready")
};