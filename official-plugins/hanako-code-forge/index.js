
const HANA_BUS_SKIP = Symbol.for("hana.event-bus.skip");

export default class Plugin {
  async onload() {
    const ctx = this.ctx;
    if (ctx.bus.handle) {
      this.register(ctx.bus.handle("hanako-code-forge:status", (payload) => {
        if (payload?.pluginId && payload.pluginId !== ctx.pluginId) return HANA_BUS_SKIP;
        return {
          ok: true,
          pluginId: ctx.pluginId,
          name: "Hanako Code Forge",
        };
      }));
    }
    ctx.log.info("Hanako Code Forge loaded");
  }

  async onunload() {
    this.ctx.log.info("Hanako Code Forge unloaded");
  }
}
