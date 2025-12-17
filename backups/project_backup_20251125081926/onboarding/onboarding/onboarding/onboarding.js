// onboarding.js — lightweight slide manager with keyboard & swipe
const slides = Array.from(document.querySelectorAll(".slide"));
const pager = document.getElementById("pager");

let current = 0;
let splashTimer = null;

function show(index){
  if(index < 0) index = 0;
  if(index >= slides.length) index = slides.length - 1;
  slides.forEach((s, i) => {
    const show = i === index;
    s.setAttribute("aria-hidden", !show);
    s.style.display = show ? "" : "none";
  });
  current = index;
  renderPager();
}

function renderPager(){
  pager.innerHTML = "";
  // skip splash from pager dots (splash is index 0)
  for(let i = 1; i < slides.length; i++){
    const btn = document.createElement("button");
    btn.className = (i === current ? "active" : "");
    btn.addEventListener("click", () => show(i));
    pager.appendChild(btn);
  }
}

// navigation buttons
document.addEventListener("click", (e) => {
  const id = e.target.id;
  if(id === "nextBtn1") show(2);
  if(id === "skipBtn1") show(slides.length - 1);
  if(id === "nextBtn2") show(3);
  if(id === "backBtn2") show(1);
  if(id === "nextBtn3") show(4);
  if(id === "backBtn3") show(2);
  if(id === "nextBtn4") show(5);
  if(id === "backBtn4") show(3);
  if(id === "getStartedBtn") {
    // go to your login/index page
    window.location.href = "../index.html";
  }
  if(id === "learnMoreBtn") {
    // open documentation or a web-page (placeholder)
    window.open("https://example.com/stokvelpro", "_blank");
  }
});

// keyboard navigation
document.addEventListener("keydown", (e) => {
  if(e.key === "ArrowRight") show(current + 1);
  if(e.key === "ArrowLeft") show(current - 1);
  if(e.key === "Escape") show(slides.length - 1);
});

// basic swipe gesture for touch devices
let touchStartX = 0;
let touchEndX = 0;
document.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].screenX; });
document.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;
  if(Math.abs(diff) > 40){
    if(diff > 0) show(current + 1);
    else show(current - 1);
  }
});

// auto transition from splash (index 0) to slide 1
function startSplashTimer(){
  clearTimeout(splashTimer);
  splashTimer = setTimeout(() => show(1), 1500);
}

// init
show(0);
startSplashTimer();
