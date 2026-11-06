// Resolve against the module so deployment under a site prefix also works.
export const cities = [
  {id:'beijing',name:'Пекин',url:new URL('../beijing/',import.meta.url).href},
  {id:'shenzhen',name:'Шэньчжэнь',url:new URL('../shenzhen/',import.meta.url).href},
];
