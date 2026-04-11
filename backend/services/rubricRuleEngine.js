const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toLower = (value) => String(value ?? '').toLowerCase();

const compare = (left, op, right) => {
  const leftNum = Number(left);
  const rightNum = Number(right);
  const bothNumbers = Number.isFinite(leftNum) && Number.isFinite(rightNum);

  switch (op) {
    case '>':
      return bothNumbers ? leftNum > rightNum : String(left) > String(right);
    case '>=':
      return bothNumbers ? leftNum >= rightNum : String(left) >= String(right);
    case '<':
      return bothNumbers ? leftNum < rightNum : String(left) < String(right);
    case '<=':
      return bothNumbers ? leftNum <= rightNum : String(left) <= String(right);
    case '==':
    case '=':
      return bothNumbers ? leftNum === rightNum : String(left) === String(right);
    case '!=':
      return bothNumbers ? leftNum !== rightNum : String(left) !== String(right);
    case 'contains':
      return toLower(left).includes(toLower(right));
    case 'startsWith':
      return toLower(left).startsWith(toLower(right));
    case 'endsWith':
      return toLower(left).endsWith(toLower(right));
    case 'in': {
      const values = Array.isArray(right) ? right : [right];
      return values.some(v => compare(left, '==', v));
    }
    case 'between': {
      if (!Array.isArray(right) || right.length < 2) return false;
      const min = Number(right[0]);
      const max = Number(right[1]);
      if (!Number.isFinite(min) || !Number.isFinite(max) || !bothNumbers) return false;
      return leftNum >= min && leftNum < max;
    }
    default:
      return false;
  }
};

const evalFilter = (row, filter) => {
  if (!filter || typeof filter !== 'object') return true;

  if (Array.isArray(filter.all)) {
    return filter.all.every(f => evalFilter(row, f));
  }
  if (Array.isArray(filter.any)) {
    return filter.any.some(f => evalFilter(row, f));
  }

  const field = filter.field;
  const op = filter.op || '==';
  const value = Object.prototype.hasOwnProperty.call(filter, 'value') ? filter.value : filter.values;
  if (!field) return true;

  return compare(row[field], op, value);
};

const normalizeScore = (scoreSpec, maxMarks) => {
  if (typeof scoreSpec === 'string' && scoreSpec.toUpperCase() === 'MAX') {
    return toNumber(maxMarks, 0);
  }
  return Math.max(0, toNumber(scoreSpec, 0));
};

const evaluateRowBandRule = (rule, rows, maxMarks) => {
  const filters = Array.isArray(rule.filters) ? rule.filters : [];
  const bands = Array.isArray(rule.bands) ? rule.bands : [];
  const valueField = rule.valueField;
  if (!valueField || bands.length === 0) {
    return { applied: false, score: 0, reason: 'Missing valueField/bands' };
  }

  const aggregation = String(rule.aggregation || 'sum').toLowerCase();
  let score = aggregation === 'max' ? 0 : normalizeScore(rule.baseScore, maxMarks);

  for (const row of rows) {
    if (!filters.every(f => evalFilter(row, f))) continue;

    const value = row[valueField];
    const band = bands.find(b => {
      if (Array.isArray(b.conditions) && b.conditions.length > 0) {
        return b.conditions.every(cond => evalFilter(row, cond));
      }
      if (b.op) {
        return compare(value, b.op, Object.prototype.hasOwnProperty.call(b, 'value') ? b.value : b.values);
      }
      const minOk = !Object.prototype.hasOwnProperty.call(b, 'min') || compare(value, '>=', b.min);
      const maxOk = !Object.prototype.hasOwnProperty.call(b, 'max') || compare(value, '<', b.max);
      return minOk && maxOk;
    });

    if (!band) continue;

    const bandScore = normalizeScore(
      Object.prototype.hasOwnProperty.call(band, 'score') ? band.score : 'MAX',
      maxMarks
    );

    if (aggregation === 'max') {
      score = Math.max(score, bandScore);
    } else if (aggregation === 'first') {
      score = bandScore;
      break;
    } else {
      score += bandScore;
    }
  }

  if (!rule.allowExceedMax) {
    score = Math.min(score, toNumber(maxMarks, 0));
  }

  if (rule.maxScore !== undefined && rule.maxScore !== null) {
    score = Math.min(score, normalizeScore(rule.maxScore, maxMarks));
  }

  return { applied: true, score };
};

const evaluateCountRule = (rule, rows, maxMarks) => {
  const filters = Array.isArray(rule.filters) ? rule.filters : [];
  const count = rows.filter(row => filters.every(f => evalFilter(row, f))).length;
  const perMatch = normalizeScore(
    Object.prototype.hasOwnProperty.call(rule, 'scorePerMatch') ? rule.scorePerMatch : 'MAX',
    maxMarks
  );
  let score = count * perMatch;

  if (!rule.allowExceedMax) {
    score = Math.min(score, toNumber(maxMarks, 0));
  }

  if (rule.maxScore !== undefined && rule.maxScore !== null) {
    score = Math.min(score, normalizeScore(rule.maxScore, maxMarks));
  }

  return { applied: true, score };
};

const evaluateExistsRule = (rule, rows, maxMarks) => {
  const filters = Array.isArray(rule.filters) ? rule.filters : [];
  const exists = rows.some(row => filters.every(f => evalFilter(row, f)));
  const trueScore = normalizeScore(
    Object.prototype.hasOwnProperty.call(rule, 'trueScore') ? rule.trueScore : 'MAX',
    maxMarks
  );
  const falseScore = normalizeScore(rule.falseScore ?? 0, maxMarks);
  return { applied: true, score: exists ? trueScore : falseScore };
};

const parseRuleConfig = (ruleConfig) => {
  if (!ruleConfig) return null;
  if (typeof ruleConfig === 'object') return ruleConfig;
  if (typeof ruleConfig === 'string') {
    try {
      return JSON.parse(ruleConfig);
    } catch (_) {
      return null;
    }
  }
  return null;
};

const evaluateRuleConfig = ({ ruleConfig, dataSources, rubric }) => {
  const rule = parseRuleConfig(ruleConfig);
  if (!rule || typeof rule !== 'object') {
    return { applied: false, score: 0, reason: 'Invalid rule config' };
  }

  const sourceTable = rule.sourceTable || rule.source || rubric.data_source;
  if (!sourceTable) {
    return { applied: false, score: 0, reason: 'Missing source table' };
  }

  const rows = Array.isArray(dataSources[sourceTable]) ? dataSources[sourceTable] : [];
  const ruleType = String(rule.ruleType || rule.type || 'exists').toLowerCase();
  const maxMarks = rubric.max_marks;

  if (ruleType === 'row_band') {
    return evaluateRowBandRule(rule, rows, maxMarks);
  }
  if (ruleType === 'count') {
    return evaluateCountRule(rule, rows, maxMarks);
  }
  if (ruleType === 'exists') {
    return evaluateExistsRule(rule, rows, maxMarks);
  }
  if (ruleType === 'fixed') {
    return {
      applied: true,
      score: normalizeScore(Object.prototype.hasOwnProperty.call(rule, 'score') ? rule.score : 0, maxMarks)
    };
  }

  return { applied: false, score: 0, reason: `Unsupported rule type: ${ruleType}` };
};

module.exports = {
  evaluateRuleConfig,
  parseRuleConfig
};
