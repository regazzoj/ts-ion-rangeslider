import { EventType, TargetType } from "../enums"

export class EventBus<DetailType = {eventTarget?: EventTarget; keyCode?: string; target?:TargetType; x?:number}> {
  private readonly _eventTarget: EventTarget
  constructor() { this._eventTarget = new EventTarget() }
  on(type: EventType, listener: (event: CustomEvent<DetailType>) => void) { this._eventTarget.addEventListener(type, listener as EventListener) }
  once(type: EventType, listener: (event: CustomEvent<DetailType>) => void) { this._eventTarget.addEventListener(type, listener as EventListener, { once: true }) }
  off(type: EventType, listener: (event: CustomEvent<DetailType>) => void) { this._eventTarget.removeEventListener(type, listener as EventListener) }
  emit(type: EventType, detail?: DetailType) { return this._eventTarget.dispatchEvent(new CustomEvent(type, { detail })) }
}


// export class EventBusSingleton {
//     private static _eventBus: EventBus;
//     private static get value() {
//         if(!EventBusSingleton._eventBus) {
//             this._eventBus = new EventBus();
//         }
//         return EventBusSingleton._eventBus
//     }
//
//     static on(type: EventType, listener: (event: CustomEvent) => void) {
//         // eslint-disable-next-line no-console
//         console.log("listening on", type);
//         this.value.on(type, listener);
//     }
//
//     static once(type: EventType, listener: (event: CustomEvent) => void) {
//         // eslint-disable-next-line no-console
//         console.log("listening once", type);
//         this.value.once(type, listener);
//     }
//
//     static off(type: EventType, listener: (event: CustomEvent) => void) {
//         // eslint-disable-next-line no-console
//         console.log("listening off", type);
//         this.value.off(type, listener);
//     }
//
//     static emit(type: EventType, detail: {eventTarget?: EventTarget; target?: string; x?:number}) {
//         // eslint-disable-next-line no-console
//         console.log("emit on", type);
//         this.value.emit(type, detail);
//     }
// }
