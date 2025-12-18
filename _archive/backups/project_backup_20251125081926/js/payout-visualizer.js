// js/payout-visualizer.js
export function renderPayoutVisualizer(containerId, percent){
  const container = document.getElementById(containerId);
  if(!container) return;
  container.innerHTML = '';
  const size = 120;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox','0 0 100 100');

  const radius = 40;
  const cx = 50, cy = 50;
  const circleBg = document.createElementNS(svgNS,'circle');
  circleBg.setAttribute('cx',cx); circleBg.setAttribute('cy',cy); circleBg.setAttribute('r',radius);
  circleBg.setAttribute('fill','none'); circleBg.setAttribute('stroke','rgba(255,255,255,0.06)'); circleBg.setAttribute('stroke-width','10');
  svg.appendChild(circleBg);

  const circle = document.createElementNS(svgNS,'circle');
  circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',radius);
  circle.setAttribute('fill','none'); circle.setAttribute('stroke','var(--accent-2)'); circle.setAttribute('stroke-width','10');
  circle.setAttribute('stroke-linecap','round');
  const circumference = 2 * Math.PI * radius;
  circle.setAttribute('stroke-dasharray', circumference.toString());
  const offset = circumference * (1 - (percent / 100));
  circle.setAttribute('stroke-dashoffset', offset.toString());
  circle.style.transform = 'rotate(-90deg)';
  circle.style.transformOrigin = '50% 50%';
  svg.appendChild(circle);

  const label = document.createElement('div');
  label.style.position='absolute';
  label.style.width='100%';
  label.style.textAlign='center';
  label.style.top='40%';
  label.style.left='0';
  label.style.fontWeight='800';
  label.style.fontSize='14px';
  label.textContent = `${Math.round(percent)}%`;

  const wrapper = document.createElement('div');
  wrapper.style.position='relative';
  wrapper.style.width = size + 'px';
  wrapper.style.height = size + 'px';
  wrapper.appendChild(svg);
  wrapper.appendChild(label);
  container.appendChild(wrapper);
}
