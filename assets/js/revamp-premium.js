(function(){
 const reduce=window.false /* animations on every device */;
 if(!reduce){
  document.querySelectorAll('.section-title,.about-one__right,.counter-one__single,.why-choose-one__left,.why-choose-one__right,.floor-plan__main-tab-box,.services-one__single,.gallery-page__single,.contact-one__left,.contact-one__right').forEach((el,i)=>{el.classList.add(i%5===0?'reveal-left':'reveal-up');});
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal-up,.reveal-left').forEach(e=>io.observe(e));
 }
 // improve keyboard focus and form UX without changing original content
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});}}));
})();
