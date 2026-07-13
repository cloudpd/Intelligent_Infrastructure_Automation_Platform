class CheckoutStepGenerator {
  generate() {
    return {
      name: 'Checkout Repository',
      uses: 'actions/checkout@v4',
    };
  }
}

module.exports = CheckoutStepGenerator;
