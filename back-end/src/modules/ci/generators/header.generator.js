class HeaderGenerator {
  constructor(pipelineName) {
    this.pipelineName = pipelineName;
  }

  generate() {
    return {
      name: this.pipelineName,
    };
  }
}

module.exports = HeaderGenerator;
