'use client'
import {useEffect} from 'react'
export default function RulesNav(){
 useEffect(()=>{
  const nav=document.querySelector('.mainnav');
  if(!nav || nav.querySelector('[data-rules-nav]')) return;
  const button=document.createElement('button');
  button.type='button'; button.dataset.rulesNav='true'; button.textContent='Rules';
  button.onclick=()=>{window.location.href='/rules'};
  nav.appendChild(button);
  return ()=>button.remove();
 },[])
 return null
}
