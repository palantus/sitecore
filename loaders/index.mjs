import expressLoader from './express.mjs';
import modsLoader from './mods.mjs';
import menuLoader from './menu.mjs';
import dataLoader from './data.mjs';
import setupLoader from './setup.mjs';
import serviceLoader from '../services/serviceRoot.mjs';
import SearchQueryParser from "searchqueryparser";

export default async ({ app, mode, config, storagePath }) => {
  if(mode != "www"){
    await (new SearchQueryParser()).init()
  }

  setupLoader({ app, mode, config, storagePath })
  
  await modsLoader({ app, mode, config });
  
  if(mode != "www"){
    await menuLoader({ app, mode, config });
  }

  await expressLoader({ app, mode, config });
  
  if(mode != "www"){
    await dataLoader({ app, mode, config });
    await serviceLoader();
  }
  
  console.log("Server ready")
};