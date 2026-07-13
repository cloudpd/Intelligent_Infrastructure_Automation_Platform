class TriggerGenerator {
  constructor(branch) {
    this.branch = branch;
  }

  generate() {
    return {
      on: {
        push: {
          branches: [this.branch],
        },
      },
    };
  }
}

module.exports = TriggerGenerator;
