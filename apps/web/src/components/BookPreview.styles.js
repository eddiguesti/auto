export const STYLES = `
.bp3-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 14px;
  background: rgba(0,0,0,.92);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  animation: bp3In .3s;
}
@keyframes bp3In { from { opacity: 0 } to { opacity: 1 } }
.bp3-modal {
  width: min(1200px, 96vw);
  max-height: 96vh;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px;
  animation: bp3Up .45s ease-out;
}
@keyframes bp3Up { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
.bp3-head {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
}
.bp3-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.bp3-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #d4a574, rgba(180,140,90,.4));
  box-shadow: 0 0 0 2.5px rgba(212,165,116,.1);
}
.bp3-bname { font-weight: 700; color: rgba(255,255,255,.9); font-size: 13px; letter-spacing: -.01em }
.bp3-bmeta { color: rgba(255,255,255,.4); font-size: 10px; margin-top: 1px }
.bp3-nav { display: flex; align-items: center; gap: 6px }
.bp3-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 8px 14px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  color: rgba(255,255,255,.75);
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: .15s; font-family: inherit;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  backdrop-filter: blur(8px);
}
.bp3-btn:hover:not(:disabled) { background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.08)); color: #fff }
.bp3-btn:active:not(:disabled) { transform: translateY(1px) }
.bp3-btn:disabled { opacity: .25; cursor: default }
.bp3-cnt {
  color: rgba(255,255,255,.4); font-size: 11px;
  min-width: 80px; text-align: center;
  font-variant-numeric: tabular-nums;
}
.bp3-x {
  width: 34px; height: 34px;
  display: grid; place-items: center;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  color: rgba(255,255,255,.55);
  cursor: pointer; transition: .15s;
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  backdrop-filter: blur(8px);
  margin-left: 2px;
}
.bp3-x:hover { background: rgba(255,70,70,.2); border-color: rgba(255,70,70,.25); color: #fff }
.bp3-shell {
  width: min(1200px, 98vw);
  height: min(780px, 78vh);
  position: relative;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.bp3-canvas { width: 100%; height: 100% }
.bp3-canvas canvas { display: block; touch-action: none; cursor: pointer }
.bp3-loader {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; z-index: 50;
}
.bp3-loader p { color: rgba(255,255,255,.45); font-size: 12px }
.bp3-spin {
  width: 28px; height: 28px;
  border: 2px solid rgba(212,165,116,.12);
  border-top-color: #d4a574;
  border-radius: 50%;
  animation: bp3Spin .7s linear infinite;
}
@keyframes bp3Spin { to { transform: rotate(360deg) } }
.bp3-hint { color: rgba(255,255,255,.2); font-size: 10px; text-align: center; margin: 0 }
.bp3-prog {
  width: min(340px, 72%); height: 3px;
  background: rgba(255,255,255,.05);
  border-radius: 99px;
  position: relative; overflow: hidden;
}
.bp3-prog-fill {
  height: 100%;
  background: linear-gradient(90deg, #8B7355, #d4a574);
  border-radius: 99px;
  transition: width .5s;
}
.bp3-prog-t {
  position: absolute; top: -14px; right: 0;
  font-size: 9px; color: rgba(255,255,255,.3);
}
@media (max-width: 768px) {
  .bp3-shell { height: min(560px, 65vh) }
  .bp3-head { flex-direction: column; align-items: stretch }
  .bp3-nav { justify-content: center }
  .bp3-brand { justify-content: center }
  .bp3-hint { font-size: 9px }
}
@media (max-width: 480px) {
  .bp3-overlay { padding: 6px }
  .bp3-shell { height: min(450px, 60vh); width: 100vw }
  .bp3-btn { padding: 6px 10px; font-size: 11px }
  .bp3-cnt { min-width: 60px; font-size: 10px }
  .bp3-bname { font-size: 12px }
}
@media (max-height: 600px) {
  .bp3-shell { height: 55vh }
}
`
