self.onmessage = function (e) {
	const { searchQuery, data } = e.data;
	const results = data.filter((asset) =>
	  asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
	  asset.name.toLowerCase().includes(searchQuery.toLowerCase())
	);
	self.postMessage(results);
  };
  