import flatpickr from "../src";
import { Instance } from "../src/types/instance";
import { Options } from "../src/types/options";
import { Temporal } from "temporal-polyfill";
import { initTemporalPolyfill } from "../src/utils/dates";

// Helper to create a flatpickr instance
function createInstance(config?: Options): Instance {
  const element = document.createElement("input");
  document.body.appendChild(element);
  return flatpickr(element, config) as Instance;
}

describe("Temporal Calendar Support", () => {
  let instance: Instance;

  beforeAll(async () => {
      // Ensure polyfill is loaded
      await initTemporalPolyfill();
  });

  afterEach(() => {
    if (instance) {
      instance.destroy();
      instance.element.remove();
    }
  });

  test("Hebrew Calendar Rendering", () => {
    // Current ISO Date
    const nowISO = Temporal.Now.plainDateISO();
    const hebrewDate = nowISO.withCalendar("hebrew");

    // Create instance with hebrew calendar
    instance = createInstance({
      calendar: "hebrew",
      useTemporalFormatting: true
    });

    const currentYearElem = instance.currentYearElement;

    expect(instance.currentYear).toBe(hebrewDate.year);
    expect(currentYearElem.value).toBe(String(hebrewDate.year));

    // Check Month
    // Temporal months are 1-based, flatpickr 0-based
    expect(instance.currentMonth).toBe(hebrewDate.month - 1);

    // Check if days are rendered
    const days = instance.daysContainer!.querySelectorAll(".flatpickr-day");
    expect(days.length).toBeGreaterThan(0);

    // Verify a specific day (Today)
    const todayElem = instance.daysContainer!.querySelector(".today");
    expect(todayElem).not.toBeNull();
    // The text content should be the Hebrew day of month
    expect(todayElem!.textContent).toBe(String(hebrewDate.day));
  });

  test("Japanese Calendar Rendering", () => {
     const nowISO = Temporal.Now.plainDateISO();
     const japaneseDate = nowISO.withCalendar("japanese");

     instance = createInstance({
       calendar: "japanese",
       useTemporalFormatting: true
     });

     expect(instance.currentYear).toBe(japaneseDate.year);

     const days = instance.daysContainer!.querySelectorAll(".flatpickr-day");
     expect(days.length).toBeGreaterThan(27);
  });

  test("Ethiopic Calendar Rendering", () => {
    const nowISO = Temporal.Now.plainDateISO();
    const ethiopicDate = nowISO.withCalendar("ethiopic");

    instance = createInstance({
      calendar: "ethiopic",
      useTemporalFormatting: true
    });

    expect(instance.currentYear).toBe(ethiopicDate.year);
    const todayElem = instance.daysContainer!.querySelector(".today");
    expect(todayElem!.textContent).toBe(String(ethiopicDate.day));
  });

  test("Chinese Calendar Rendering", () => {
    const nowISO = Temporal.Now.plainDateISO();
    const chineseDate = nowISO.withCalendar("chinese");

    instance = createInstance({
      calendar: "chinese",
      useTemporalFormatting: true
    });

    expect(instance.currentYear).toBe(chineseDate.year);
    const todayElem = instance.daysContainer!.querySelector(".today");
    expect(todayElem!.textContent).toBe(String(chineseDate.day));
  });

  test("Month Navigation with Temporal", () => {
      // Initialize with Hebrew calendar
      instance = createInstance({
        calendar: "hebrew",
        useTemporalFormatting: true
      });

      const prevMonth = instance.currentMonth;

      // Move to next month
      instance.changeMonth(1);

      const nextMonthDate = Temporal.Now.plainDateISO()
          .withCalendar("hebrew")
          .add({ months: 1 });

      expect(instance.currentYear).toBe(nextMonthDate.year);
      // Handle month wrap around if needed (though add({months:1}) handles it)
      expect(instance.currentMonth).toBe(nextMonthDate.month - 1);
  });

  test("Formatting with Temporal", () => {
      // 2024-01-01 ISO
      const date = new Date(2024, 0, 1);

      instance = createInstance({
        calendar: "hebrew",
        useTemporalFormatting: true,
        dateFormat: "Y-m-d",
        defaultDate: date
      });

      // 2024-01-01 is 5784-04-20 in Hebrew (Tevet 20, 5784)
      const hebrewDate = Temporal.Instant.fromEpochMilliseconds(date.getTime())
        .toZonedDateTimeISO(Temporal.Now.timeZoneId())
        .withCalendar("hebrew");

      const formatted = instance.formatDate(date, "Y-m-d");

      const expectedYear = String(hebrewDate.year);
      const expectedMonth = String(hebrewDate.month).padStart(2, '0');
      const expectedDay = String(hebrewDate.day).padStart(2, '0');

      expect(formatted).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
  });

  test("Variable Month Support (Hebrew Leap Year)", () => {
      // Hebrew year 5784 is a leap year (13 months)
      // Initialize near end of year
      const date = new Date("2024-09-01"); // Elul 5784 (Month 12/13?)

      const hebrewDate = Temporal.Instant.fromEpochMilliseconds(date.getTime())
        .toZonedDateTimeISO(Temporal.Now.timeZoneId())
        .withCalendar("hebrew");

      instance = createInstance({
        calendar: "hebrew",
        useTemporalFormatting: true,
        defaultDate: date
      });

      expect(instance.currentYear).toBe(hebrewDate.year); // 5784
      expect(instance.currentMonth).toBe(hebrewDate.month - 1);

      const monthsInYear = hebrewDate.monthsInYear;
      expect(monthsInYear).toBe(13); // 5784 is leap

      // Check month dropdown items
      // If we are in month dropdown mode, we should see 13 options
      if (instance.monthsDropdownContainer) {
          expect(instance.monthsDropdownContainer.options.length).toBe(13);
      }
  });

  test("Ethiopic 13th Month Grid Rendering", () => {
      // 2020 Ethiopic is Leap, has 13 months. Pagume is month 13 (index 12).
      // 2028-09-08 is roughly Pagume 3, 2020 Ethiopic.
      // Let's pick a date in Pagume.
      // 2028-09-06 is Pagume 1, 2020 Ethiopic.
      const date = new Date("2028-09-06");

      instance = createInstance({
        calendar: "ethiopic",
        useTemporalFormatting: true,
        defaultDate: date
      });

      // Navigate to Pagume (Month 12)
      // Check if grid rendered correctly
      // Previous month is Nehasse (30 days)
      // If Pagume 1 is Wednesday (example), previous days should be 27, 28, 29, 30 of Nehasse.
      // The bug reported was showing "6 6 6".

      const prevMonthDays = instance.daysContainer!.querySelectorAll(".prevMonthDay");
      if (prevMonthDays.length > 0) {
          const lastPrevDay = prevMonthDays[prevMonthDays.length - 1];
          // Should be 30 (Nehasse always 30)
          expect(lastPrevDay.textContent).toBe("30");
      }

      const currentMonthDays = instance.daysContainer!.querySelectorAll(".flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)");
      // Pagume has 5 days in 2020 (based on Temporal)
      expect(currentMonthDays.length).toBe(5);
  });

  test("Ethiopic View on Open (Issue 1 Regression)", () => {
    // 2023-09-12 is 2016-01-01 (Meskerem 1) in Ethiopic (Amete Mihret)
    // temporal-polyfill 0.3.0 'ethiopic' seems to default to Amete Alem era (Year ~7516).
    const date = new Date("2023-09-12T00:00:00");

    instance = createInstance({
      calendar: "ethiopic",
      defaultDate: date,
      useTemporalFormatting: true
    });

    // Internal state should reflect Ethiopic date (Era year 7516 per temporal-polyfill)
    // This confirms we are NOT seeing Gregorian 2023.
    expect(instance.currentYear).toBe(7516);
    expect(instance.currentMonth).toBe(0);

    const yearInput = instance.currentYearElement;
    expect(yearInput.value).toBe("7516");
  });

  test("Ethiopic 13th Month Label (Issue 2 Regression)", () => {
    // 2023-09-06 is Pagume 1, 2015 Ethiopic. (Amete Alem 7515)
    const date = new Date("2023-09-06T00:00:00");

    instance = createInstance({
      calendar: "ethiopic",
      defaultDate: date,
      useTemporalFormatting: true
    });

    expect(instance.currentYear).toBe(7515);
    expect(instance.currentMonth).toBe(12); // Pagume

    const monthSelect = instance.monthsDropdownContainer;
    expect(monthSelect.value).toBe("12");
    expect(monthSelect.options[monthSelect.selectedIndex].textContent).toContain("Pagume");
  });

  test("Explicit Test for buildMonthDays Logic (User Request)", () => {
     // 1. Gregorian (Standard)
     const instanceGreg = createInstance({
         calendar: "iso8601",
         defaultDate: "2023-10-01"
     });
     // Oct 1 2023 is Sunday.
     let days = instanceGreg.daysContainer!.querySelectorAll(".flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)");
     expect(days[0].textContent).toBe("1");
     instanceGreg.destroy();

     // 2. Ethiopic
     // 2016-01-01 Ethiopic is 2023-09-12 Gregorian (Tuesday)
     const instanceEth = createInstance({
         calendar: "ethiopic",
         defaultDate: new Date("2023-09-12"), // Meskerem 1
         useTemporalFormatting: true
     });

     // Meskerem 1 is Tuesday.
     const prevDays = instanceEth.daysContainer!.querySelectorAll(".prevMonthDay");
     expect(prevDays.length).toBe(2);

     days = instanceEth.daysContainer!.querySelectorAll(".flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)");
     expect(days[0].textContent).toBe("1");
     expect(days.length).toBe(30);
     instanceEth.destroy();

     // 3. Hebrew
     // Rosh Hashanah 5784 is 2023-09-16 (Saturday)
     const instanceHeb = createInstance({
         calendar: "hebrew",
         defaultDate: new Date("2023-09-16"),
         useTemporalFormatting: true
     });

     // Tishrei 1 is Saturday.
     const prevDaysHeb = instanceHeb.daysContainer!.querySelectorAll(".prevMonthDay");
     expect(prevDaysHeb.length).toBe(6);

     days = instanceHeb.daysContainer!.querySelectorAll(".flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)");
     expect(days[0].textContent).toBe("1");
     expect(days.length).toBe(30);
     instanceHeb.destroy();
  });
});
