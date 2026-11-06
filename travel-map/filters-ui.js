import {categoryEmoji} from './category-icons.js';
import {el} from './dom.js';
import {availableTags,filterPoints,inGroup,matchesPoint} from './taxonomy.js';
export class Filters {
  constructor(context,{label,onChange}) {
    this.context=context;this.label=label;this.onChange=onChange;
    this.state={group:'',category:'',subtype:'',tags:[],query:''};
    this.quick=document.getElementById('filter-tags');this.details=document.getElementById('filter-details');this.toggle=document.getElementById('filter-toggle');
    this.group=document.getElementById('filter-group');this.category=document.getElementById('filter-category');this.subtype=document.getElementById('filter-subtype');this.search=document.getElementById('place-search');
    const options=[{id:'',label:'Все места',count:context.points.length},...availableTags(context.points,context)];
    for(const tag of options){
      const button=el('button',`${tag.label} · ${tag.count}`,'tag-filter');
      button.type='button';button.dataset.tag=tag.id;button.onclick=()=>{
        if(!tag.id){this.reset();return;}
        this.state.tags=this.state.tags.includes(tag.id)?this.state.tags.filter(id=>id!==tag.id):[...this.state.tags,tag.id];this.render();
      };this.quick.append(button);
    }
    this.quickExpanded=false;this.quickToggle=document.getElementById('quick-tags-toggle');
    this.quickToggle.onclick=()=>{this.quickExpanded=!this.quickExpanded;this.layoutQuickTags();};
    document.getElementById('quick-tags').addEventListener('keydown',event=>{
      if(event.key==='Escape'&&this.quickExpanded){event.stopPropagation();this.quickToggle.focus();this.quickExpanded=false;this.layoutQuickTags();}
    });
    this.quickResize=new ResizeObserver(([entry])=>{
      if(entry.contentRect.width===this.quickWidth)return;
      this.quickWidth=entry.contentRect.width;cancelAnimationFrame(this.quickFrame);
      this.quickFrame=requestAnimationFrame(()=>this.layoutQuickTags());
    });this.quickResize.observe(this.quick);
    document.fonts?.ready.then(()=>this.layoutQuickTags());
    this.toggle.onclick=()=>{const open=this.details.hidden;this.details.hidden=!open;this.toggle.setAttribute('aria-expanded',String(open));};
    this.search.oninput=()=>{this.state.query=this.search.value;this.render();};
    this.group.onchange=()=>{this.state.group=this.group.value;this.state.category=this.state.subtype='';this.render();};
    this.category.onchange=()=>{this.state.category=this.category.value;this.state.subtype='';this.render();};
    this.subtype.onchange=()=>{this.state.subtype=this.subtype.value;this.render();};
    document.getElementById('filter-clear').onclick=()=>{this.reset();this.search.focus();};
    document.getElementById('filters').hidden=false;this.render();this.layoutQuickTags();
  }
  layoutQuickTags(){
    const buttons=[...this.quick.children];buttons.forEach(button=>button.hidden=false);
    const firstTop=buttons[0]?.offsetTop,remaining=buttons.filter(button=>button.offsetTop>firstTop+1);
    this.quickToggle.hidden=!remaining.length;
    this.quickToggle.setAttribute('aria-expanded',String(this.quickExpanded));
    const label=this.quickExpanded?'Свернуть теги':'Показать все теги';
    this.quickToggle.setAttribute('aria-label',label);this.quickToggle.title=label;
    if(!this.quickExpanded){this.quick.scrollTop=0;remaining.forEach(button=>button.hidden=true);}
  }
  reset(){this.state={group:'',category:'',subtype:'',tags:[],query:''};this.search.value='';this.render();}
  includes(point){return matchesPoint(point,this.state,this.context);}
  populate(select,placeholder,options,value){
    const first=el('option',placeholder);first.value='';select.replaceChildren(first);
    for(const {id,label,disabled=false}of options){const option=el('option',label);option.value=id;option.disabled=disabled;select.append(option);}select.value=value;
  }
  render(){
    const {context,state}=this,points=filterPoints(context.points,state,context);
    const active=state.tags.length+[state.group,state.category,state.subtype,state.query].filter(Boolean).length;
    this.quick.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tag?state.tags.includes(button.dataset.tag):!active)));
    this.populate(this.group,'Любое занятие',context.city.taxonomy.groups.map(group=>({id:group.id,label:group.label,disabled:!context.points.some(p=>inGroup(p,group.id,context))})),state.group);
    this.populate(this.category,'Все категории',context.categories.map(category=>{const members=context.points.filter(p=>p.categoryId===category.id&&inGroup(p,state.group,context));return {id:category.id,label:`${categoryEmoji(category.icon)} ${category.label} · ${members.length}`,disabled:!members.length};}),state.category);
    const base=context.points.filter(p=>inGroup(p,state.group,context)&&(!state.category||p.categoryId===state.category));
    const subtypes=new Set(base.map(p=>p.subtype));
    this.populate(this.subtype,'Все типы мест',Object.entries(context.city.taxonomy.subtypes).filter(([id])=>subtypes.has(id)).map(([id,label])=>({id,label})),state.subtype);this.subtype.disabled=!subtypes.size;
    const selected=document.getElementById('places').value,placeholder=el('option',points.length?'Выберите место на карте или в списке':'Нет мест — измените фильтры');placeholder.value='';
    const select=document.getElementById('places');select.replaceChildren(placeholder);
    for(const category of context.categories){const members=points.filter(p=>p.categoryId===category.id);if(!members.length)continue;const group=el('optgroup');group.label=categoryEmoji(category.icon)+' '+category.listLabel;for(const p of members){const option=el('option',this.label(p));option.value=p.id;group.append(option);}select.append(group);}
    if(points.some(p=>p.id===selected))select.value=selected;select.disabled=!points.length;
    this.toggle.textContent=active?`Фильтры · ${active}`:'Фильтры';
    document.getElementById('filter-count').textContent=`Показано ${points.length} из ${context.points.length}`;
    this.onChange(points);
  }
}
