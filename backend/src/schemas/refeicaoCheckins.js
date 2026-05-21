const { z, isoDate } = require('./_common');

const checkinBody = z.object({
  data: isoDate.optional(),
});

const checkinQuery = z.object({
  data: isoDate.optional(),
});

module.exports = { checkinBody, checkinQuery };
