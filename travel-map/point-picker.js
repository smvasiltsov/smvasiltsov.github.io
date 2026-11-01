import {el} from './dom.js';
export class PointPicker {
  constructor(container,onChoose,label){this.onChoose=onChoose;this.label=label;this.node=el('section');this.node.id='point-picker';this.node.setAttribute('role','dialog');this.node.setAttribute('aria-label','Места рядом');this.node.hidden=true;container.append(this.node);}
  hide(){this.node.hidden=true;}
  open(point,candidates){
    if(candidates.length<2){this.onChoose(point);return;}
    this.node.replaceChildren();this.node.hidden=false;
    const header=el('div',undefined,'point-picker-heading'),close=el('button','×');close.type='button';close.setAttribute('aria-label','Закрыть список мест');close.onclick=()=>{this.hide();document.getElementById('places').focus({preventScroll:true});};header.append(el('strong',`Места рядом · ${candidates.length}`),close);this.node.append(header);
    const list=el('div',undefined,'point-picker-list');for(const p of candidates){const button=el('button',this.label(p));button.type='button';button.onclick=()=>this.onChoose(p);list.append(button);}this.node.append(list);list.querySelector('button').focus({preventScroll:true});this.node.scrollTop=0;
  }
}
