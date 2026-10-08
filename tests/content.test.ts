// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
test('activation, source change, missing EXIF and shutdown', async () => {
  let enabled = false;
  const listeners: ((changes: object, area: string) => void)[] = [];
  let intersect: IntersectionObserverCallback;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe() {} unobserve() {} disconnect() {}
  });
  const sendMessage = vi.fn().mockResolvedValue({status:'ok',data:{focal:35,iso:160,exposure:1/60,aperture:1.8,flash:15,camera:'NIKON Z 6'}});
  vi.stubGlobal('chrome', {storage:{local:{get:async()=>({enabled})},onChanged:{addListener:(fn:typeof listeners[number])=>listeners.push(fn)}},runtime:{sendMessage}});
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(fn, 0));
  document.body.innerHTML = '<ul><li data-id="1"><img src="https://images.pixieset.com/123/test-medium.jpg"></li></ul>';
  const image = document.querySelector('img')!;
  Object.defineProperty(image, 'getBoundingClientRect', {value:()=>({left:0,top:0,bottom:240,width:360,height:240})});
  Object.defineProperty(image, 'getClientRects', {value:()=>[{}]});
  await import('../src/content'); await new Promise(resolve => setTimeout(resolve, 10));
  expect(document.querySelector('pixieset-exif-label')).toBeNull();
  enabled = true; listeners[0]({enabled:{newValue:true}},'local');
  intersect!([{target:image,isIntersecting:true}] as IntersectionObserverEntry[], {} as IntersectionObserver);
  await new Promise(resolve=>setTimeout(resolve,10));
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(document.querySelector('pixieset-exif-label')).not.toBeNull();
  image.src = 'https://images.pixieset.com/123/second-medium.jpg';
  await new Promise(resolve=>setTimeout(resolve,10));
  sendMessage.mockResolvedValueOnce({status:'missing'});
  intersect!([{target:image,isIntersecting:true}] as IntersectionObserverEntry[], {} as IntersectionObserver);
  await new Promise(resolve=>setTimeout(resolve,10));
  expect(sendMessage).toHaveBeenLastCalledWith({type:'read',url:image.src});
  listeners[0]({enabled:{newValue:false}},'local');
  expect(document.querySelector('pixieset-exif-label')).toBeNull();
  vi.unstubAllGlobals();
});
