import { alertDialog } from "../../../components/dialog.mjs";

export class Command{
  context = {}

  async run(){
    alertDialog("Not implemented")
  }

  getQueryWithoutKeywords(){
    return removeKeywordsFromQuery(this.context.query, this.constructor.keywords)
  }
}

export function removeKeywordsFromQuery(query, keywords){
  return query?.filter(w => {
    for(let keyword of keywords){
      if((keyword.words||[keyword.word]).includes(w)){
        return false;
      }
    }
    return true;
  })||[]
}