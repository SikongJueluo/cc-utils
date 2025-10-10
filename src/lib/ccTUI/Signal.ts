/**
 * Signal and Slot system similar to Qt
 * Allows components to communicate with each other
 */
export class Signal<T = void> {
  private slots: ((data?: T) => void)[] = [];

  connect(slot: (data?: T) => void): void {
    this.slots.push(slot);
  }

  disconnect(slot: (data?: T) => void): void {
    const index = this.slots.indexOf(slot);
    if (index !== -1) {
      this.slots.splice(index, 1);
    }
  }

  emit(data?: T): void {
    for (const slot of this.slots) {
      try {
        slot(data);
      } catch (e) {
        printError(e);
      }
    }
  }
}
