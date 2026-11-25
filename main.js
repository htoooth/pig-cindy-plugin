cindy.onHostMessage(async function (msg) {
  if (msg.type !== 'harnesses-refresh-requested') return;
  try {
    const response = await cindy.node.request({
      method: 'harness/probe',
      params: {},
      timeoutMs: 30000
    });
    if (response.ok) {
      await fetch('/harnesses', {
        method: 'PUT',
        body: JSON.stringify({ harnesses: [response.result] })
      });
    }
  } catch (error) {
    // Harness availability refresh is best effort.
  }
});

