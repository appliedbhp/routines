// A portable chart contains pictogram IDs, never executable markup or image URLs.
const ChoreChartData = (() => {
  const FORMAT = 'weekly-chore-chart';
  function text(value, label, limit = 200) {
    if (typeof value !== 'string' || value.length > limit) throw new Error(`${label} must be text of at most ${limit} characters.`);
    return value;
  }
  function validate(payload) {
    if (!payload || payload.format !== FORMAT || payload.version !== 1 || !payload.chart) {
      throw new Error('Choose a weekly chore chart exported from this site.');
    }
    const chart = payload.chart;
    if (!Array.isArray(chart.chores) || chart.chores.length > 10) throw new Error('Charts can contain up to 10 chores.');
    return {
      name: text(chart.name, 'Chart name', 100),
      person: text(chart.person, 'Name or team'),
      week: text(chart.week, 'Week of'),
      chores: chart.chores.map(chore => {
        if (!chore || (chore.pictogramId !== null && (!Number.isSafeInteger(chore.pictogramId) || chore.pictogramId <= 0))) {
          throw new Error('The chart contains an invalid picture ID.');
        }
        if (!Array.isArray(chore.checked) || chore.checked.length !== 7 || chore.checked.some(value => typeof value !== 'boolean')) {
          throw new Error('Each chore must have seven daily checkmarks.');
        }
        return { name: text(chore.name, 'Chore name'), pictogramId: chore.pictogramId, checked: [...chore.checked] };
      }),
    };
  }
  function serialize(chart) { return { format: FORMAT, version: 1, chart: validate({format: FORMAT, version: 1, chart}) }; }
  return { validate, serialize };
})();
