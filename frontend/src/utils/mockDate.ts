
const FAKE_DATE_KEY = 'fakeDate'

export function mockDate() {
  // Save the original Date constructor
  const OriginalDate = Date;

  const storedDate = sessionStorage.getItem(FAKE_DATE_KEY)

  if (!storedDate) {
    console.info('no storedDate!')
    return
  }

// Define the mocked date
  const mockedDate = new OriginalDate(storedDate);

// Override the global Date constructor
// @ts-ignore
  window.Date = class extends OriginalDate {
    constructor(...args: any[]) {
      // If Date is called without arguments, return the mocked date
      if (args.length === 0) {
        // We use Object.setPrototypeOf to create an instance without directly calling super()
        // to avoid creating a new Date with today's date.
        return Object.setPrototypeOf(mockedDate, new.target.prototype);
      }
      // Otherwise, behave like the original Date
      // @ts-ignore
      super(...args);
    }

    // Static methods also need to be handled explicitly
    static now() {
      return mockedDate.getTime();
    }
  };

}
