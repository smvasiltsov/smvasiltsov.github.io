import {categoryEmoji} from './category-icons.js';
import {el} from './dom.js';
import {filterPoints,inGroup,matchesPoint} from './taxonomy.js';
export class Filters {
  constructor(context,{label,onChange}) {
    this.context=context;this.label=label;this.onChange=onChange;
    this.state={group:'',category:'',subtype:'',tag:'',query:''};
    this.groups=document.getElementById('filter-groups');this.details=document.getElementById('filter-details');this.toggle=document.getElementById('filter-toggle');
    this.category=document.getElementById('filter-category');this.subtype=document.getElementById('filter-subtype');this.tag=document.getElementById('filter-tag');this.search=document.getElementById('place-search');
    const options=[{id:'',label:'Все места'},...context.city.taxonomy.groups];
    for(const group of options){
      const count=context.points.filter(p=>inGroup(p,group.id,context)).length,button=el('button',`${group.label} · ${count}`,'group-filter');
      button.type='button';button.dataset.group=group.id;button.disabled=!count;button.onclick=()=>{this.state.group=group.id;this.state.category=this.state.subtype=this.state.tag='';this.render();};this.groups.append(button);
    }
    this.toggle.onclick=()=>{const open=this.details.hidden;this.details.hidden=!open;this.toggle.setAttribute('aria-expanded',String(open));};
    this.search.oninput=()=>{this.state.query=this.search.value;this.render();};
    this.category.onchange=()=>{this.state.category=this.category.value;this.state.subtype='';this.render();};
    this.subtype.onchange=()=>{this.state.subtype=this.subtype.value;this.render();};this.tag.onchange=()=>{this.state.tag=this.tag.value;this.render();};
    document.getElementById('filter-clear').onclick=()=>{this.reset();this.search.focus();};
    document.getElementById('filters').hidden=false;this.render();
  }
  reset(){Object.keys(this.state).forEach(key=>this.state[key]='');this.search.value='';this.render();}
  includes(point){return matchesPoint(point,this.state,this.context);}
  populate(select,placeholder,options,value){
    const first=el('option',placeholder);first.value='';select.replaceChildren(first);
    for(const {id,label,disabled=false}of options){const option=el('option',label);option.value=id;option.disabled=disabled;select.append(option);}select.value=value;
  }
  render(){
    const {context,state}=this,points=filterPoints(context.points,state,context);
    this.groups.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.group===state.group)));
    this.populate(this.category,'Все категории',context.categories.map(category=>{const members=context.points.filter(p=>p.categoryId===category.id&&inGroup(p,state.group,context));return {id:category.id,label:`${categoryEmoji(category.icon)} ${category.label} · ${members.length}`,disabled:!members.length};}),state.category);
    const base=context.points.filter(p=>inGroup(p,state.group,context)&&(!state.category||p.categoryId===state.category));
    const subtypes=new Set(base.map(p=>p.subtype)),tags=new Set(base.flatMap(p=>p.tags));
    this.populate(this.subtype,'Все типы мест',Object.entries(context.city.taxonomy.subtypes).filter(([id])=>subtypes.has(id)).map(([id,label])=>({id,label})),state.subtype);this.subtype.disabled=!subtypes.size;
    this.populate(this.tag,'Все особенности',Object.entries(context.city.taxonomy.tags).filter(([id])=>tags.has(id)).map(([id,label])=>({id,label})),state.tag);
    const selected=document.getElementById('places').value,placeholder=el('option',points.length?'Выберите место на карте или в списке':'Нет мест — измените фильтры');placeholder.value='';
    const select=document.getElementById('places');select.replaceChildren(placeholder);
    for(const category of context.categories){const members=points.filter(p=>p.categoryId===category.id);if(!members.length)continue;const group=el('optgroup');group.label=categoryEmoji(category.icon)+' '+category.listLabel;for(const p of members){const option=el('option',this.label(p));option.value=p.id;group.append(option);}select.append(group);}
    if(points.some(p=>p.id===selected))select.value=selected;select.disabled=!points.length;
    const active=Object.values(state).filter(Boolean).length;this.toggle.textContent=active?`Фильтры · ${active}`:'Фильтры';
    document.getElementById('filter-count').textContent=`Показано ${points.length} из ${context.points.length}`;
    this.onChange(points);
  }
}
