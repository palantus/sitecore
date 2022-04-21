export function refToPath(ref){
  switch(ref.type){

    // Override this file to include custom ref types

    default:
      return ref.uiPath || "";
  }
}