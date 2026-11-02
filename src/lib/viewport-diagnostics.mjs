/** Records numerical viewport geometry only; never any prompt or response text. */
export function viewportSample(input) {
 const keys=['innerHeight','scrollY','visualHeight','offsetTop','pageTop','scale','composerTop','composerBottom','appTop','appBottom'];
 const sample={};
 for(const key of keys)sample[key]=Number.isFinite(input[key])?Math.round(input[key]*10)/10:null;
 sample.focused=Boolean(input.focused);
 return sample;
}
