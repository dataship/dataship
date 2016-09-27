/*

	A collection of functions for doing data analysis and numerical computation
	in javascript, the built-in library for [dataship.io](http://dataship.io).

	Namespaced functions are exposed in both the `dataship` and `ds` namespaces.

	__NOTE: This library is in beta. Method names, signatures and namespace
	layouts may change.__
 *
 * @exampleHelpers
 *
 * function fullTitle(row){
 *     return row.Title + " (" + row.Year + ")";
 * }
 *
 * var fullTitleResult = [
 *     "Fight Club (1999)",
 *     "The Matrix (1999)",
 *     "Stranger Than Fiction (2006)",
 * ];
 *
 * var cutoff = ds.frame.groupers.interval("Rating", [8]);
 *
 * var middle = ds.frame.groupers.interval("Rating", [5]);
 *
 * var noneShallPass = ds.frame.groupers.interval("Rating", [9]);
 *
 * var averageRatingByYear = {
 *    1999 : 8.8,
 *    2006 : 7.6
 * };
 *
 * var financials = [
 *    {"Budget": 63000000, "Gross":  37023395},
 *    {"Budget": 63000000, "Gross": 171383253},
 *    {"Budget": 38000000, "Gross":  40137776}
 * ];
 *
 * var moviesWithFinancials = [
 *     {"Title":"Fight Club",            "Year":1999, "Budget": 63000000, "Gross": 37023395},
 *     {"Title":"The Matrix",            "Year":1999, "Budget": 63000000, "Gross":171383253},
 *     {"Title":"Stranger Than Fiction", "Year":2006, "Budget": 38000000, "Gross": 40137776}
 * ];
 *
 * var animals = { "People" : 21, "Cats" : 0,  "Dogs" : 3};
 *
 *	@name Dataship
 *	@version 0.3.1
 */
(function (global) {
/*
	The terms mapping and dictionary are all used interchangably
	and refer to a basic, single level, javascript object.

	```
	{
		"name" : "Bruce",
		"age" : 30,
		"occupation" : "playboy"
	}
	```

	An index is a mapping with the additional constraint that the values
	are numbers (most often integers). These frequently occur in aggregation results.

	```
	{
		"total_lives_saved" : 1247,
		"total_buildings_destroyed" : 102,
		"total_ice_cream_eaten" : 54
	}
	```

	The terms data and dataset are used interchangably and refer to an array
	of objects. Objects in this context are frequently called rows.

	```
	[
		{ "name" : "Alfred", "age" : 45 },
		{ "name" : "Bruce",  "age" : 30 },
		{ "name" : "Lucius", "age" : 42 }
	]
	```
 */

// polyfills

function objectValues(obj){
	var keys = Object.keys(obj);

	return keys.map(function(key){ return obj[key]; });
}
Object.values = Object.values || objectValues;

// extras

global.range = range;
global.type = type;
global.map = map;
global.reduce = reduce;
global.slice = slice;
global.filter = filter;

// abbrevation
global.dataship = dataship = {};
global.ds = ds = global.dataship;


/** Turn an index (the output from {@link dataship.frame.groupby}) into a
 *  frame data structure.
 *
 *	`ds.frame(index, labels)`
 *
 *	* index - a javascript object with numeric values (output by {@link dataship.frame.groupby}).
 *	* labels - an array of two strings to use as the column labels.
 *
 *	@examples
 * var averageRatingByYear = {
 *    1999 : 8.8,
 *    2006 : 7.6
 * };
 *
 * var framed = [
 *    {"Year" : "1999", "Rating" : 8.8},
 *    {"Year" : "2006", "Rating" : 7.6}
 * ];
 *
 *	ds.frame(averageRatingByYear, ["Year", "Rating"])	// => framed
 *
 */
dataship.frame = function framify(index, labels){
	labels = labels || ["key", "value"];

	var result = [];
	var row;
	for(var key in index){
		row = {};
		row[labels[0]] = key;
		row[labels[1]] = index[key];
		result.push(row);
	}

	return result;
};


dataship.frame.groupers = {};

dataship.stats = {};
/*
	"linearRegression" : linearRegression
rolling_mean
*/

dataship.num = {};

// semi private utility functions
dataship.util = {};

dataship.vis = {};

dataship.vis.groupby = {};

dataship.map = {
	"sqrt" : Math.sqrt,
	"pow" : Math.pow,
	"exp" : Math.exp,
	"abs" : Math.abs,
	"log" : Math.log
};

dataship.reduce = {};

// expose common functions at top level
dataship.groupby = dataship.frame.groupby;
dataship.histogram = dataship.vis.histogram;


/* Return the type of an object as a string.

	@examples
	type("hello")				// => "string"
	type({})					// => "object"
	type([])					// => "array"
	type(new Float32Array())	// => "float32array"
	type(1)						// => "integer"
	type(1.1)					// => "float"
	type(new Date())			// => "date"
	type(Number.NaN)			// => "float"

*/
function type(obj){

	var base = Object.prototype.toString.call(obj).slice(8, -1);
	if(base == "Number"){
		if(obj % 1 === 0) return "integer";
		else return "float";
	} else {
		return base.toLowerCase();
	}
}

function isarray(obj){ return Object.prototype.toString.call(obj) === "[object Array]";}
function isobject(obj){ return Object.prototype.toString.call(obj) === "[object Object]";}
function isnumber(obj){ return Object.prototype.toString.call(obj) === "[object Number]";}
function isinteger(num){ return num % 1 === 0;}
function isstring(obj){ return Object.prototype.toString.call(obj) === "[object String]";}
function isfunction(obj){ return Object.prototype.toString.call(obj) === "[object Function]"; }
function isframe(obj){ return isarray(obj) && (obj.length == 0 || isobject(obj[0])); }
function isdate(obj){ return Object.prototype.toString.call(obj) === "[object Date]";}

/**  Generate an array of numbers

	@examples
	range(5)     		// => [ 0,  1,  2,  3,  4]
	range(10, 15)		// => [10, 11, 12, 13, 14]
	range(0, 100, 10)	// => [ 0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
*/
function range(start, stop, step){

	if(arguments.length == 1){
		stop = start;
		start = 0;
	}

	step = (step === void(0)) ? 1 : step;
	var N = (stop > start) ? Math.ceil((stop - start) / step) : 0;

	return Array.from(new Array(N).keys()).map(function(n){ return start + n * step});
}

/* Extract a subset of an array or object, based on indices or keys. Can also
 * be used to reorder arrays (e.g. in conjunction with {@link dataship.num.argsort}).
 *
 * `slice(array, begin, end)`
 *	* `array` - the array to extract from
 *	* `begin` - the first index to extract
 *	* `end` - the last index to extract
 *
 *	`slice(array, indices)`
 *
 *	* `array` - the array to extract from
 *	* `indices` - an array of indices to extract from the array
 *
 *	`slice(object, keys)`
 *
 *	* `object` - an object to extract from
 *	* `keys` - an array of keys to extract from the object
 *
 *
 *	@examples
 *	slice([1, 2, 3, 4], 0, 3)	// => [1, 2, 3]
 *	slice([1, 2, 3, 4], [1, 0, 3])	// => [2, 1, 4]
 *	slice({"a" : 4, "b" : 0, "c" : 32}, ["b", "c"])	// => {"b" : 0, "c" : 32}
 *	slice({"a" : 4, "b" : 0, "c" : 32}, 1)	// => {"b" : 0, "c" : 32}
 */
function slice(data, begin, end){

	if(isarray(data) && isinteger(begin)) return data.slice(begin, end);

	var result = isarray(data) ? [] : {};

	var index;
	if(isinteger(begin)){
		index = Object.keys(data).slice(begin, end);
	} else {
		index = begin;
	}

	var outkey;
	for(var i = 0; i < index.length; i++){
		key = index[i];
		if(isarray(data)) outkey = i;
		else outkey = key;
		result[outkey] = data[key];
	}

	return result;
}

/* Like Array.prototype.filter, but works on objects, too.
 * @examples
 * filter({"a" : 3, "b" : 1, "c" : 5}, function(x){ return x > 1})	// => {"a" : 3, "c" : 5}
 */
function filter(data, func){

	if(isarray(data)) return data.filter(func);

	var result = {};

	for(key in data){
		if(func(data[key], key, data)) result[key] = data[key];
	}

	return result;

}

/* Like Array.prototype.map, but works on objects, too.

	@examples
	map([1, 2, 3, 4], function(x){ return x * 2})	// => [2, 4, 6, 8]
	map({"a" : 1, "b" : 2}, function(x){ return x * 2})	// => {"a" : 2, "b" : 4}
*/
function map(data, func){

	if(isarray(data)) return data.map(func);

	var result = {};

	for(key in data){
		result[key] = func(data[key], key, data);
	}

	return result;
}

/* Like Array.prototype.reduce, but works on objects, too.

	@examples
	reduce([1, 2, 3, 4], ds.reduce.max)	// => 4
	reduce({"a" : 1, "b" : 2}, ds.reduce.min)	// => 1
*/
function reduce(data, func, initial){

	if(isarray(data)){
		if(initial == null) return data.reduce(func);
		else return data.reduce(func, initial);
	}

	var result = null;

	var i = 0;
	for(key in data){
		if(result === null){
			result = initial != null ?  func(initial, data[key], i) : data[key];
		} else {
			result = func(result, data[key], i);
		}

		i++;
	}

	return result;
}

/* Array.prototype.reduce style function for finding the maximum
 * @examples
 * [1, 1, 1].reduce(ds.reduce.max)			// => 1
 * [3, 1, 3, 5].reduce(ds.reduce.max)		// => 5
 * reduce({"a" : 1, "b" : 0, "c" : 2}, ds.reduce.max)	// => 2
 */
dataship.reduce.max = function(agg, val) { return agg > val ? agg : val; };

/* Array.prototype.reduce style function for finding the minimum
 * @examples
 * [1, 1, 1].reduce(ds.reduce.min)			// => 1
 * [3, 1, 3, 5].reduce(ds.reduce.min)		// => 1
 * reduce({"a" : 1, "b" : 0, "c" : 2}, ds.reduce.min)	// => 0
 */
dataship.reduce.min = function(agg, val) { return agg < val ? agg : val; };

/* Array.prototype.reduce style function for finding the most common value
 * @examples
 * [1, 1, 1].reduce(ds.reduce.mode)			// => 1
 * [1, 3, 3, 7].reduce(ds.reduce.mode)		// => 3
 * reduce({"a" : 1, "b" : 0, "c" : 2}, ds.reduce.mode)	// => 1
 */
dataship.reduce.mode = function(agg, val, n) {
	if(n === 0) return val;

	if(n === 1){
		// internal state hack (compatible with groupby)
		self = dataship.reduce.mode.state = {};
		self.values = {};
		self.values[agg] = 1;
		self.argmax = agg;
	} else {
		self = dataship.reduce.mode.state;
	}

	if(val in self.values)
		self.values[val] += 1;
	else
		self.values[val] = 1;

	if(self.values[val] > self.values[agg])
		self.argmax = val;

	return self.argmax;
}

/* Array.prototype.reduce style function for finding the middle value
 * @examples
 * [1, 1, 1].reduce(ds.reduce.median)			// => 1
 * [1, 3, 3, 7].reduce(ds.reduce.median)		// => 3
 * [4, 1, 7].reduce(ds.reduce.median)			// => 4
 * reduce({"a" : 4, "b" : 1, "c" : 7}, ds.reduce.median)	// => 4
 */
dataship.reduce.median = function(agg, val, n) {
	if(n === 0) return val;

	if(n === 1){
		// internal state hack (compatible with groupby)
		self = dataship.reduce.mode.state = {};
		self.values = [agg];
	} else {
		self = dataship.reduce.mode.state;
	}

	// insert the new value into the sorted array
	dataship.util.insert(self.values, val);

	var middle = self.values.length / 2 | 0;
	// even number of elements?
	if(self.values.length % 2 !== 0){
		// no, return the middle one
		return self.values[middle];
	} else {
		// yes, return the average of the middle two
		return (self.values[middle - 1] + self.values[middle]) / 2;
	}
}

/* Array.prototype.reduce style function for counting number of elements
 * @examples
 * [1, 1, 1].reduce(ds.reduce.count)			// => 3
 * [3, 1, 3, 5].reduce(ds.reduce.count)		// => 4
 * reduce({"a" : 1, "b" : 0, "c" : 2}, ds.reduce.count)	// => 3
 */
dataship.reduce.count = function(agg, val, n){ return n + 1; };

/* Array.prototype.reduce style function for finding the sum
 * @examples
 * [1, 1, 1].reduce(ds.reduce.sum)			// => 3
 * [3, 1, 3, 5].reduce(ds.reduce.sum)		// => 12
 * reduce({"a" : 1, "b" : 0, "c" : 2}, ds.reduce.sum)	// => 3
 */
dataship.reduce.sum = function(agg, val){ return agg + val; };

/* Array.prototype.reduce style function for finding the arithmetic mean
 * @examples
 * [1, 1, 1].reduce(ds.reduce.mean)			// => 1
 * [3, 1, 3, 5].reduce(ds.reduce.mean)		// => 3
 * reduce({"a" : 1, "b" : 0, "c" : 2}, ds.reduce.mean)	// => 1
 */
dataship.reduce.mean = function(agg, val, n){ return (agg + ((val - agg)/(n + 1))); };

/* Elementwise equality
 */
dataship.num.equal = function equal(a, b){
	if(a.length !== b.length) return false;

	for(var i = 0; i < a.length; i++){
		if(a[i] !== b[i]) return false;
	}

	return true;
};

/* Elementwise approximate equality.
 */
dataship.num.allclose = function allclose(a, b, rtol, atol){
	rtol = rtol || 1e-05;
	atol = atol || 1e-08;

	if(a.length !== b.length) return false;

	for(var i = 0; i < a.length; i++){
		if(Math.abs(a[i] - b[i]) > (atol + rtol * Math.abs(b[i]))) return false;
	}

	return true;
};

/* Divide everything in an array or object by a value, returns a copy.

	@examples
	ds.num.divide([2, 4, 6, 8], 2)		// => [1, 2, 3, 4]
	ds.num.divide({"a" : 4, "b" : 8, "c" : 10}, 2)	// => {"a" : 2, "b" : 4, "c" : 5}
*/
dataship.num.divide = function divide(data, divisor){
	return map(data, function(x) { return x/divisor;});
}

dataship.num.div = dataship.num.divide;

/* Multiply everything in an array or object by a value, returns a copy.

	@examples
	ds.num.multiply([1, 2, 3, 4], 2)		// => [2, 4, 6, 8]
	ds.num.multiply({"a" : 2, "b" : 4}, 2)	// => {"a" : 4, "b" : 8}
*/
dataship.num.multiply = function multiply(data, multiplier){
	return map(data, function(x) { return x * multiplier;});
}

dataship.num.mul = dataship.num.multiply;

/* Take the square root of everything in an array or object, returns a copy.

	@examples
	ds.num.sqrt([1, 4, 9, 16])		// => [1, 2, 3, 4]
	ds.num.sqrt({"a" : 9, "b" : 16}, 2)	// => {"a" : 3, "b" : 4}
*/
dataship.num.sqrt = function sqrt(data){
	return map(data, Math.sqrt);
}

/* Raise everything in an array or object to a given power, returns a copy.

	@examples
	ds.num.pow([1, 2, 3, 4], 2)		// => [1, 4, 9, 16]
*/
dataship.num.pow = function pow(data, power){
	return map(data, function(x) { return Math.pow(x, power); });
}

/* Raise Euler's Number to the power of everything in an array or object, returns a copy.

	@examples
	ds.num.exp([1, 2, 3, 4])		// => [1, 2, 3, 4].map(Math.exp)
*/
dataship.num.exp = function exp(data){
	return map(data, Math.exp);
}

/* Find and return the absolute value of everything in an array or object, returns a copy.

	@examples
	ds.num.abs([1, -2, 3, 4, -5])		// => [1, 2, 3, 4, 5]
*/
dataship.num.abs = function abs(data){
	return map(data, Math.abs);
}

/* Take the natural logarithm of everything in an array or object, returns a copy.

	@examples
	ds.num.log([1, 2, 3, 4])		// => [1, 2, 3, 4].map(Math.log)
*/
dataship.num.log = function log(data){
	return map(data, Math.log);
}


/* Find and return the max in an array or object (with numerical values)

	@examples
	ds.num.max([1, 5, 3, 9, 2, 4])			// => 9
	ds.num.max([20, 3, 87, 24, 93, 55])		// => 93
	ds.num.max({"a" : 23, "b" : 12, "c" : 45, "d" : 18})	// => 45
*/
dataship.num.max = function max(data){
	return reduce(data, ds.reduce.max);
}

/* Find and return the min in an array or object (with numerical values)

	@examples
	ds.num.min([1, 5, 3, 9, 2, 4])			// => 1
	ds.num.min([20, 3, 87, 24, 93, 55])		// => 3
	ds.num.min({"a" : 23, "b" : 12, "c" : 45, "d" : 18})	// => 12
*/
dataship.num.min = function min(data){
	return reduce(data, ds.reduce.min);
}

/* Find and return the most common value in an array or object (with numerical values),
	or the first such value if multiple exist.

	@examples
	ds.num.mode([1, 5, 3, 5, 2, 4])			// => 5
	ds.num.mode([20, 3, 87, 24, 93, 55])		// => 20
	ds.num.mode({"a" : 23, "b" : 12, "c" : 45, "d" : 12})	// => 12
*/
dataship.num.mode = function mode(data){
	return reduce(data, ds.reduce.mode);
}

/* Find and return the most common value in an array or object (with numerical values),
	or the first such value if multiple exist.

	@examples
	ds.num.median([1, 5, 3, 5, 2, 4])			// => 3.5
	ds.num.median([20, 3, 87, 24, 93, 55, 46])		// => 46
	ds.num.median({"a" : 23, "b" : 12, "c" : 45, "d" : 12})	// => 17.5
*/
dataship.num.median = function mode(data){
	return reduce(data, ds.reduce.median);
}

/* Sum all them elements in an array or object (with numerical values)

	@examples
	ds.num.sum([1, 5, 3, 9, 2, 4])			// => 24
	ds.num.sum([20, 3, 87, 24, 93, 55])		// => 282
	ds.num.sum({"a" : 23, "b" : 12, "c" : 45, "d" : 18})	// => 98
*/
dataship.num.sum = function sum(data){
	return reduce(data, ds.reduce.sum);
}

/* Calculate the arithmetic mean of elements in an array or object (with numerical values)

	@examples
	ds.num.mean([1, 5, 3, 9, 2, 4])			// => 4
	ds.num.mean([20, 3, 87, 24, 93, 55])	// => 47
	ds.num.mean({"a" : 23, "b" : 12, "c" : 45, "d" : 18})	// => 24.5
*/
dataship.num.mean = function mean(data){
	return reduce(data, ds.reduce.mean);
}

/* Create a new Array filled with zeros

	@examples
	ds.num.zeros(5)		// => [0, 0, 0, 0, 0]
	ds.num.zeros(7)		// => [0, 0, 0, 0, 0, 0, 0]
 */
dataship.num.zeros = function zeros(len) { return newFilledArray(len, 0); }

/* Create a new Array filled with ones

	@examples
	ds.num.ones(3)		// => [1, 1, 1]
	ds.num.ones(8)		// => [1, 1, 1, 1, 1, 1, 1, 1]
*/
dataship.num.ones = function ones(len) { return newFilledArray(len, 1); }

function newFilledArray(len, val) {
	var rv = new Array(len);
	while (--len >= 0) {
		rv[len] = val;
	}
	return rv;
}

/* Find and return the index or label of the max value in an array
	or object (with numerical values)

	@examples
	ds.num.argmax([1, 5, 3, 9, 2, 3])			// => 3
	ds.num.argmax([20, 3, 87, 24, 93, 54])		// => 4
	ds.num.argmax({"a" : 23, "b" : 12, "c" : 45, "d" : 18})	// => "c"
*/
dataship.num.argmax = function argmax(data){

	var val, arg, max = Number.MIN_SAFE_INTEGER;

	// find max
	for(key in data){
		val = data[key];
		if(val > max){
			max = val;
			arg = key;
		}
	}

	return isarray(data) ? parseInt(arg) : arg;
}

/* Return the keys in the order which sorts the values.
 * Works on arrays and objects, when values have a default sort order.
 *
 * @examples
 * var numbers = [10, 3, 125, 42];

 * ds.num.argsort(numbers);	// => [1, 0, 3, 2]
 *
 * var animals = { "People" : 21, "Cats" : 0,  "Dogs" : 3};
 *
 * ds.num.argsort(animals);	// => ["Cats", "Dogs", "People"]
 *
 */
dataship.num.argsort = function argsort(data){

	if(!isobject(data) && !isarray(data)) throw new Error("works only on arrays and objects");

	keys = isobject(data) ? Object.keys(data) : range(0, data.length);

	keys.sort(function(a, b){
		if(data[a] < data[b]) return -1;
		if(data[b] < data[a]) return 1;

		return 0;
	});

	return keys;
}


/* Rename the columns in a dataset or the keys in an object/index.
 *
 *	Use the specified mapping from old labels to new to modify labels in the object
 * or dataset.
 *
 *	`relabel(obj, labels)`
 *
 *  * obj - object to rename
 *	* labels - mapping from old labels to new
 *
 *	`relabel(dataset, labels)`
 *
 *	* dataset - frame containing objects to relabel columns of
 *	* labels - mapping from old labels to new
 *
 *
 * @examples
 *
 * var result = {
 *    "foo" : 20,
 *	  "bar" : 30
 * };
 *
 * ds.frame.relabel({"0" : 20, "1": 30}, {"0": "foo", "1" : "bar"})	// => result
 */
dataship.frame.relabel = function relabel(obj, labels){

	if(isframe(obj)){
		for(var i = 0; i < obj.length; i++){
			relabelObject(obj[i], labels);
		}
	} else {
		relabelObject(obj, labels);
	}

	return obj;
}

function relabelObject(obj, labels){

	for(key in obj){
		if(key in labels){
			obj[labels[key]] = obj[key];
			delete obj[key];
		}
	}

	return obj;
}

/* Get an array of column labels for a dataset.
 *
 * `ds.frame.labels(dataset)`
 *
 * @examples
 * var movies = [
 *     {"Title":"Fight Club",            "Year":1999},
 *     {"Title":"The Matrix",            "Year":1999},
 *     {"Title":"Stranger Than Fiction", "Year":2006}
 * ];
 *
 * ds.frame.labels(movies)		// => ["Title", "Year"]
 *
 */
dataship.frame.labels = function(dataset){
	if(!isframe(dataset)) throw new Error("dataset isn't a valid frame");

	if(dataset.length == 0) return [];

	return Object.keys(dataset[0]);
}

/* Extract a column (or virtual column) from a dataset and return it as an array.
 *
 *	`ds.frame.column(dataset, selector)`
 *
 *	* `dataset` - an array of JSON objects
 *	* `selector` - the name of the field (string) to extract as a column or
 *		a function taking a row and returning a value (useful for creating
 *		virtual columns)
 *
 *
 * @examples
 * var movies = [
 *     {"Title":"Fight Club",            "Year":1999},
 *     {"Title":"The Matrix",            "Year":1999},
 *     {"Title":"Stranger Than Fiction", "Year":2006}
 * ];
 *
 *	ds.frame.column(movies, "Year")		// => [1999, 1999, 2006]
 *	ds.frame.column(movies, function(row){ return row.Year})	// => [1999, 1999, 2006]
 *
 *
 * function fullTitle(row){
 *     return row.Title + " (" + row.Year + ")";
 * }
 *
 * var fullTitleResult = [
 *     "Fight Club (1999)",
 *     "The Matrix (1999)",
 *     "Stranger Than Fiction (2006)",
 * ];
 *
 *	ds.frame.column(movies, fullTitle)	// => fullTitleResult
 *
 *
 */
dataship.frame.column = function column(dataset, selector){
	if(!isframe(dataset)) throw new Error("dataset isn't a valid frame");
	if(!isstring(selector) && !isfunction(selector)) throw new Error("selector must be a string or function");

	if(typeof(selector) === "string"){
		var field_name = selector;
		selector = function(row){ return row[field_name]; };
	}

	return dataset.map(selector);
}

/* Add a column or columns to a dataset, in-place
 *
 * `ds.frame.widen(dataset, values, identifier)`
 *	* dataset - array of JSON objects
 *	* values - array of values
 *	* identifier - name to use as the key for the new column
 *
 * `ds.frame.widen(dataset, datasetAdd)`
 *	* dataset - array of JSON objects to add to
 *	* datasetAdd - array of JSON objects with columns to add, must be same length as dataset
 *
 * @example
 * var movies = [
 *     {"Title":"Fight Club",            "Year":1999},
 *     {"Title":"The Matrix",            "Year":1999},
 *     {"Title":"Stranger Than Fiction", "Year":2006}
 * ];
 * var moviesCopy = JSON.parse(JSON.stringify(movies));
 *
 * var ratings = [8.9, 8.7, 7.6];
 *
 * var result = [
 *     {"Title":"Fight Club",            "Year":1999, "Rating":8.9},
 *     {"Title":"The Matrix",            "Year":1999, "Rating":8.7},
 *     {"Title":"Stranger Than Fiction", "Year":2006, "Rating":7.6}
 * ];
 *
 * ds.frame.widen(movies, ratings, "Rating")	// => result
 *
 * var financials = [
 *    {"Budget": 63000000, "Gross":  37023395},
 *    {"Budget": 63000000, "Gross": 171383253},
 *    {"Budget": 38000000, "Gross":  40137776}
 * ];
 *
 * var moviesWithFinancials = [
 *     {"Title":"Fight Club",            "Year":1999, "Budget": 63000000, "Gross": 37023395},
 *     {"Title":"The Matrix",            "Year":1999, "Budget": 63000000, "Gross":171383253},
 *     {"Title":"Stranger Than Fiction", "Year":2006, "Budget": 38000000, "Gross": 40137776}
 * ];
 *
 * ds.frame.widen(moviesCopy, financials)	// => moviesWithFinancials
 */
dataship.frame.widen = function widen(dataset, values, identifier){
	if(!isframe(dataset)) throw new Error("dataset isn't a valid frame");
	if(!isarray(values)) throw new Error("values must be an array or frame");

	if(dataset.length != values.length)
		throw new Error("datasets must be of equal lengths");

	if(dataset.length == 0) return dataset;

	// are we adding an array of numbers?
	if(isnumber(values[0])){
		// yes
		identifier = identifier || "column" + Object.keys(dataset[0]).length;

		var row;

		for(var i = 0; i < dataset.length; i++){
			row = dataset[i];
			row[identifier] = values[i];
			dataset[i] = row;
		}
	}
	else if(isobject(values[0])){
		// no, it's another dataset

		for(var i = 0; i < dataset.length; i++){
			Object.assign(dataset[i], values[i]);
		}
	}

	return dataset
}

/* Add a row or rows to a dataset, in place
 *
 */
dataship.frame.lengthen = function(dataset, row){

	if(dataset.length != values.length)
		throw new Error("datasets must be of equal lengths");


	// are we adding a row object
	if(isobject(row)){
		// yes

		// validate
		if(dataset.length == 0) return [row];

		if(!subset(dataset[0], row) || !subset(row, dataset[0]))
			throw new Error("rows must have the same columns")

		dataset.push(JSON.parse(JSON.stringify(row)));
	}
	else if(isarray(row)){
		// no, it's another dataset

		var datasetAdd = row;
		// validate
		if(datasetAdd.length == 0) return dataset;
		if(dataset.length == 0) return datasetAdd;

		if(!subset(dataset[0], datasetAdd[0]) || !subset(datasetAdd[0], dataset[0]))
			throw new Error("rows must have the same columns")


		for(var i = 0; i < datasetAdd.length; i++){
			row = datasetAdd[i];
			dataset.push(JSON.parse(JSON.stringify(row)));
		}
	}
}
function subset(obj1, obj2){
	for(key in obj1){
		if(key in obj2) continue;

		return false;
	}

	return true;
}

/* Statistical summaries for groups in a dataset.
 *
 *	`ds.frame.groupby(dataset, grouper, selector, reducer, initial)`
 *
 *	* dataset - array of javascript objects, one per row
 *	* grouper - the label of the column to group by or a
 *		function taking a row and returning a group label (virtual category)
 *	* selector - the label of the column to compute on (sum, mean, etc) or a
 *		function taking a row object and returning a number (virtual column)
 *	* reducer - `function(agg, val, n)` function to compute over all numbers in a group
 *		(default: [dataship.reduce.count](#dataship-reduce-count))
 *	* initial - value to use in first call to reducer, if not specified reducer will
 *		first be called after two values have been encountered. (see
 *		[Array.prototype.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce) )
 *
 * @examples
 * var movies = [
 *     {"Title":"Fight Club",            "Year":1999, "Rating":8.9},
 *     {"Title":"The Matrix",            "Year":1999, "Rating":8.7},
 *     {"Title":"Stranger Than Fiction", "Year":2006, "Rating":7.6}
 * ];
 *
 * var countByYear = {
 *     1999 : 2,
 *     2006 : 1
 * };
 *
 * ds.frame.groupby(movies, "Year")	// => countByYear
 *
 * var averageRatingByYear = {
 *    1999 : 8.8,
 *    2006 : 7.6
 * };
 *
 * ds.frame.groupby(movies, "Year", "Rating", ds.reduce.mean)	// => averageRatingByYear
 *
 */
dataship.frame.groupby = function groupby(dataset, grouper, selector, reducer, initial){

	// default reducer is a sum
	if(reducer == null){
		reducer = ds.reduce.count;
		initial = 0;
	}

	if(typeof(grouper) === "string"){
		var group_field = grouper;
		grouper = function(row){ return row[group_field]; };
	}

	selector = selector || grouper;

	if(typeof(selector) === "string"){
		var value_field = selector;
		selector = function(row){ return row[value_field]; };
	}

	var result = {};
	var count = {};
	var state = {};
	var row, id, agg, val, n;

	for(i = 0; i < dataset.length; i++){
		row = dataset[i];
		id = grouper(row);
		val = selector(row);
		if(result[id] === void(0)){
			if(initial != null){
				result[id] = initial;
				count[id] = 0;
				state[id] = {};
			} else {
				result[id] = val;
				count[id] = 1;
				state[id] = {};
				continue;
			}
		}
		agg = result[id];
		n = count[id];
		reducer.state = state[id];
		result[id] = reducer(agg, val, n);
		state[id] = reducer.state;
		count[id] = n + 1;
	}
	return result;
}

dataship.frame.groupers.labeler = function(selector, labeler){

	if(isstring(selector)){
		var select_field = selector;
		selector = function(row){ return row[select_field]; };
		selector.label = select_field;
	}

	if(!isfunction(labeler)){
		var labels = labeler;
		labeler = function(i){ return (i in labels) ? labels[i] : i; };
	}

	var grouper = function(row){
		var val = selector(row);
		return labeler(val);
	}

	grouper.label = selector.label;

	return grouper;
}

/* Return a function that selects a column containing numbers and puts
 *	them into numerical groups (also called bins or buckets) based on intervals.
 *
 *	`ds.frame.groupers.interval(selector, bounds, labels)`
 *
 *	* selector - the label of the column to form groups from, or a
 *		function taking a row object and returning a number (virtual column).
 *	* bounds - an array of upper bounds for the intervals, `n` values produce `n + 1` intervals.
 *	* labels - an array labels to use for the groups, instead of integers (length should be `n + 1`)
 *
 *	returns - `function(row)` takes a row and returns the label for the interval
 *    containing the selected value in that row. Returned labels are an integer in `[0, n+1]`,
 *    or the corresponding label provided in the initial constructor.
 *
 *  `[-Inf, b0), [b0, b1), ..., [bn-1, bn), [bn, Inf)`
 *
 * @examples
 * var movies = [
 *     {"Title":"Fight Club",            "Year":1999, "Rating":8.9},
 *     {"Title":"The Matrix",            "Year":1999, "Rating":8.7},
 *     {"Title":"Stranger Than Fiction", "Year":2006, "Rating":7.6}
 * ];
 *
 * var round = ds.frame.groupers.interval("Rating", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 *
 * round(movies[0])		// => 8
 * round(movies[1])		// => 8
 * round(movies[2])		// => 7
 *
 * var cutoff = ds.frame.groupers.interval("Rating", [8]);
 *
 * cutoff(movies[0])	// => 1
 * cutoff(movies[1])	// => 1
 * cutoff(movies[2])	// => 0
 *
 * var middle = ds.frame.groupers.interval("Rating", [5]);
 *
 * middle(movies[0])	// => 1
 * middle(movies[1])	// => 1
 * middle(movies[2])	// => 1
 *
 * var noneShallPass = ds.frame.groupers.interval("Rating", [9]);
 *
 * noneShallPass(movies[0])	// => 0
 * noneShallPass(movies[1])	// => 0
 * noneShallPass(movies[2])	// => 0
 */
dataship.frame.groupers.interval = function interval(selector, bounds, labels){

	if(isstring(selector)){
		var select_field = selector;
		selector = function(row){ return row[select_field]; };
		selector.label = select_field;
	}

	var labeler;
	if(labels == null || labels.length < bounds.length){
		labeler = function(i){ return i; };
	} else if(labels.length >= (bounds.length + 1)){
		 labeler = function(i){ return labels[i]; };
	} else if(labels.length == bounds.length){
		labeler = function(i){
			return (i < labels.length ? labels[i] : ">" + labels[i - 1]);
		}
	}

	var grouper = function(row){

		var val = selector(row);

		for(var i = 0; i < bounds.length; i++){
			if(val < bounds[i]){
				return labeler(i);
			}
		}
		return labeler(i);
	};
	grouper.label = selector.label;

	return grouper;
}

/* Draw a histogram chart, a bar chart created by applying {@link dataship.frame.groupby}
 * to a dataset.
 *
 *  `ds.vis.histogram(dataset, grouper, selector, reducer, fill, title)`
 *
 *
dataship.vis.histogram = histogram;
*/

/* Draw a summary bar chart, created by first applying {@link dataship.frame.groupby}
 * to a dataset.
 *
 *  `ds.vis.groupby.bar(dataset, grouper, selector, reducer, fill, title)`
 *
 *
 */
dataship.vis.groupby.bar = function histogram(dataset, grouper, selector, reducer, fill, title){

	index = dataship.frame.groupby(dataset, grouper, selector, reducer, fill);

	var name = isstring(grouper) ? grouper : grouper.label;
	title = title || titleify(name);

	dataship.vis.bar(index, name, title);
}

/* Draw a summary pie chart, a pie chart created by first applying {@link dataship.frame.groupby}
 * to a dataset.
 *
 *  `ds.vis.groupby.pie(dataset, grouper, selector, reducer, fill, title)`
 *
 *
 */
dataship.vis.groupby.pie = function(dataset, grouper, selector, reducer, fill, title){

	index = dataship.frame.groupby(dataset, grouper, selector, reducer, fill);

	var title = titleify(isstring(grouper) ? grouper : grouper.label);

	dataship.vis.pie(index, title);
}

// list of things not to capitalize in titles
var lowers = {'a':true, 'an':true, 'the':true, 'and':true, 'but':true, 'or':true, 'nor':true, 'of':true, 'on':true, 'at':true, 'from':true,  'to':true, 'by':true, 'for':true, 'in':true, 'as':true}
function titleify(identifier){
	// add spaces
	identifier = identifier.replace(/\-/g, ' ');
	identifier = identifier.replace(/\_/g, ' ');
	identifier = identifier.replace(/\./g, ' ');

	// capitalize words
	words = identifier.split(" ");
	for(i = 0; i < words.length; i++){
		word = words[i];
		if(!(word in lowers) || i == 0) word = capitalize(word);
		words[i] = word;
	}

	return words.join(' ');
}

function capitalize(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

var MAX_LABEL_LENGTH = 27;

/* Draw a bar chart.
 *
 *	`ds.vis.bar(values, labels, name, title, axis)`
 *
 *	* values - array of values (y axis)
 *	* labels - array of labels (x axis)
 *	* name - (optional) name for the data set
 *	* title - (optional) title for the chart
 *
 *	`ds.vis.bar(index, name, title)`
 *
 *	* index - object mapping labels to values
 *	* name - (optional) name for the data set
 *	* title - (optional) title for the chart
 */
dataship.vis.bar = function bar(values, labels, name, title, axis){

	// did we get an index object?
	if(isobject(values)){
		// yes, parse it out
		var obj = values;
		axis = title;
		title = name;
		name = labels;

		labels = Object.keys(obj);
		values = Object.values(obj);
	}

	name = name || "data";
	title = title || titleify(name);
	labels = labels || range(values.length);

	axis = axis || {};
	axis.x = axis.x || {};
	axis.y = axis.y || {};

	axis.x.type = 'category';
	var xAxis = { "tick" : {}, "padding" : {}};

	if(isstring(labels[0])){

		// scale x axis height to make room for labels
		var maxLabelLength = dataship.num.max(labels.map(function(s){return s.length;}));
		// more than 7?
		if(labels.length <= 7){
			// just increase the height
			xAxis.height = Math.min(25 + (maxLabelLength / 10 | 0) * 12, 100);
		} else {
			// rotate labels
			xAxis.height = Math.min(25 + maxLabelLength * 3 | 0, 100);
			xAxis.tick.rotate = 40;
			xAxis.tick.width = 200;
			xAxis.padding.right = 1;

			// more than 30?
			if(labels.length > 30){
				// don't show them all
				xAxis.tick.culling = {"max" : 30};
				xAxis.tick.fit = true;
			}

			// some labels really long?
			if(maxLabelLength > MAX_LABEL_LENGTH){
				// truncate the long ones
				labels = labels.map(function(s){ return (s.length <= MAX_LABEL_LENGTH ? s : s.substring(0, MAX_LABEL_LENGTH - 3) + "...");});
			}
		}
	}
	axis.x = Object.assign(xAxis, axis.x);
	axis.x.categories = labels;

	c3.generate({
		"data" : {
			"columns" : [
				[name].concat(values)
			],
			"type" : "bar"
		},
		"axis": axis,
		"title": { "text": title }
	});
}

/* Draw a pie chart
 *	`ds.vis.pie(values, labels, title)`
 *
 *	* values - array of values
 *	* labels - array of labels
 *	* title - (optional) title for the chart
 *
 *	`ds.vis.pie(index, title)`
 *
 *	* index - object mapping labels to values
 */
dataship.vis.pie = function(values, labels, title){

	MAX_VALUES = 20;

	// did we get an index object?
	if(isobject(values)){
		// yes, parse it out
		var obj = values;
		title = labels;

		labels = Object.keys(obj)
		values = Object.keys(obj).map(function(k){ return obj[k];})
	}

	labels = labels || range(values.length);

	var columns = [], label;
	for(var i = 0; i < values.length && i < MAX_VALUES; i++){
		label = labels.length > i ? labels[i] : i;

		columns.push([label, values[i]]);
	}

	c3.generate({
		data: {
			// iris data from R
			columns: columns,
			type : 'pie',
		},
		title: { text: title }
	});
}

// timeseries(dataset, value_selector, label_selector)
// line (with automatic timeseries detection)
// scatter

var MAX_AXIS_PRECISION = 6;
/* Draw a line chart, values must be numeric, labels must be numeric or strings
 * representing [ISO-8601](https://xkcd.com/1179/) timestamps.
 *
 *	`ds.vis.line(values, labels, name, title, axis)`
 *
 *	* values - array of values (y axis)
 *	* labels - array of numeric labels (x axis)
 *	* name - (optional) name for the data set
 *	* title - (optional) title for the chart
 *  * axis - (optional) c3 axis options
 *
 *	`ds.vis.line(index, name, title)`
 *
 *	* index - object mapping labels to values
 */
dataship.vis.line = function(values, labels, name, title, axis){

	// did we get an index object?
	if(isobject(values)){
		// yes, parse it out
		var obj = values;
		axis = title;
		title = name;
		name = labels;

		labels = Object.keys(obj);
		values = labels.map(function(k){ return obj[k];});
	}

	name = name || "data";
	title = title || titleify(name);
	labels = labels || range(values.length);

	if(values.length == 0 || labels.length == 0) return;

	if(!isnumber(values[0])) throw new Error("values must be numeric");

	axis = axis || {};
	axis.x = axis.x || {};
	axis.y = axis.y || {};

	var dates,
		valid = false;
	var xAxis = {"tick" : {}, "padding": {}},
		textLength = 12;

	if(isstring(labels[0])){

		// try to parse as date-time
		if(moment){
			var m = moment(labels[0], ["YYYY", moment.ISO_8601], true)
			valid = m.isValid();

			dates = valid ? labels.map(function(x){ return moment(x, ["YYYY", moment.ISO_8601], true).toDate(); }) : [];
		} else {
			valid = !isNaN(Date.parse(labels[0]));

			dates = valid ? labels.map(function(x){ return new Date(Date.parse(x));}) : [];
		}

		if(valid){
			labels = dates;
			xAxis.type = "timeseries";
			xAxis.tick.format = minimalDateFormat(dates);
			textLength = xAxis.tick.format.length;

			//Object.assign(axis.x, { "type":"timeseries", "tick" : { "format" : dateFormat } });
		} else  {
			valid = !isNaN(parseFloat(labels[0]));
			labels = valid ? labels.map(parseFloat) : labels;
			textLength = 12;
		}

	} else if(isdate(labels[0])){

		valid = true;
		xAxis.type = "timeseries";
		xAxis.tick.format = minimalDateFormat(labels);
		textLength = xAxis.tick.format.length;
		//Object.assign(axis.x, { "type":"timeseries", "tick" : { "format" : dateFormat } });
	}

	// scale x axis height to make room for labels
	if(labels.length <= 7){
		xAxis.height = Math.min(25 + (textLength / 10 | 0) * 12, 100);
	} else {
		xAxis.height = Math.min(25 + textLength * 3 | 0, 100);
		xAxis.tick.rotate = 40;
		xAxis.tick.width = 200;
		xAxis.padding.right = 1;

		if(labels.length > 30){
			// too many labels to show all
			xAxis.tick.culling = {"max" : 30};
			xAxis.tick.fit = true;
		}
	}

	axis.x = Object.assign(xAxis, axis.x);

	if(!isnumber(labels[0]) && !valid) throw new Error("labels must be numeric, or valid date-time strings");

	if(!isinteger(values[0])){
		precision = Math.min(minimalPrecision(values), MAX_AXIS_PRECISION);

		Object.assign(axis.y, { "tick" : { "format" : function(x){ return x.toFixed(precision)}}});
	}

	c3.generate({
		"data" : {
			"x" : 'labels',
			"columns" : [
				['labels'].concat(labels),
				[name].concat(values)
			]
		},
		"axis" : axis,
		"title": { "text": title }
	})
}

/* find the minimal number of digits for floating point display
 * @private
 */
function minimalPrecision(values){
	if(values.length == 0) return 0;

	var max = Number.MIN_SAFE_INTEGER, min = Number.MAX_SAFE_INTEGER;

	for(var i = 0; i < values.length; i++){
		max = max < values[i] ? values[i] : max;
		min = min > values[i] ? values[i] : min;
	}

	return Math.max(1, Math.ceil(Math.log10(1 / (max - min)) + 1));
}

/* find the right display format for an array of dates, by checking the range
they cover
 @private
 */
function minimalDateFormat(dates){

	if(dates.length == 0) return "%Y";

	// generate list of indices to check
	//var indices = {0: true, (dates.length - 1) : true};

	// see precisions in chosen subsample
	var found = {};
	var show = {};
	var date;
	for(var i = 0; i < dates.length; i++){
		date = dates[i];

		if(found.year && found.year !== date.getFullYear()) show.year = true;
		else found.year = date.getFullYear();

		if(found.month && found.month !== date.getMonth()){show.month = true;}
		else{found.month = date.getMonth();}

		if(found.day && found.day !== date.getDate()){show.day = true;}
		else{found.day = date.getDate();}

		if(found.hour && found.hour !== date.getHours()) show.hour = true;
		else found.hour = date.getHours();

		if(found.minute && found.minute !== date.getMinutes()) show.minute = true;
		else found.minute = date.getMinutes();

		if(found.second && found.second !== date.getSeconds()) show.second = true;
		else found.second = date.getSeconds();
	}
	show.time = show.hour || show.minute || show.second;
	show.date = show.year || show.month || show.day;

	// show both?
	if(show.date && show.time){
		// yes, use the full format
		return '%Y-%m-%d %H:%M:%S';
	} else if(show.date){
		if(show.day) return '%Y-%m-%d';
		else if(show.month) return '%Y-%m';
		else return '%Y';
	} else {
		return '%H:%M:%S';
	}
}

/* Draw a scatter plot, values and labels must both be numeric.
 *
 * `ds.vis.scatter(values, labels, name, title)`
 *
 *	* values - array of values (y axis)
 *	* labels - array of numeric labels (x axis)
 *	* name - (optional) name for the data set
 *	* title - (optional) title for the chart
 *  * axis - (optional) c3 axis options
 *
 * `ds.vis.scatter(index, name, title)`
 *
 *	* index - object mapping labels to values
 *
 *	* values - array of values (y axis)
 *	* labels - array of labels (x axis)
 *	* name - (optional) name for the data set
 *	* title - (optional) title for the chart
 *  * axis - (optional) c3 axis options
 *
 */
dataship.vis.scatter = function scatter(values, labels, name, title, axis){

	// did we get an index object?
	if(isobject(values)){
		// yes, parse it out
		var obj = values;
		axis = title;
		title = name;
		name = labels;

		labels = Object.keys(obj);
		values = labels.map(function(k){ return obj[k];})
	}

	name = name || "data";
	title = title || titleify(name);
	labels = labels || range(values.length);

	if(values.length == 0 || labels.length == 0) return;
	var valid = false;

	if(isstring(labels[0])){
		valid = !isNaN(parseFloat(labels[0]));
		labels = valid ? labels.map(parseFloat) : labels;
	}

	if(!isnumber(values[0]) || (!isnumber(labels[0]) && !valid)) throw new Error("values and labels must be numeric");

	axis = axis || {};
	axis.x = axis.x || {};
	axis.y = axis.y || {};

	if(!isinteger(values[0])){
		precision = Math.min(minimalPrecision(values), MAX_AXIS_PRECISION);

		Object.assign(axis.y, { "tick" : { "format" : function(x){ return x.toFixed(precision)}}});
	}

	if(!isinteger(labels[0])){
		precision = Math.min(minimalPrecision(values), MAX_AXIS_PRECISION);

		Object.assign(axis.x, { "tick" : { "format" : function(x){ return x.toFixed(precision)}}});
	}

	c3.generate({
		"data": {
			"x": "labels",
			"columns": [
				["labels"].concat(labels),
				[name].concat(values),
			],
			"type": 'scatter'
		},
		"axis" : axis,
		"title": { "text": title }
	});
}

dataship.stats.linearRegression = function linearRegression(y,x){
/* Simple linear regression
 *
 * @examples
 * var y = [1, 2, 3, 4];
 * var x = [1, 2, 3, 4];
 *
 * var result = {
 *    slope: 1,
 *    intercept: 0,
 *    r2: 1
 * };
 *
 * ds.frame.stats.linearRegression(y, x)		// => result
 */

	// did we get an index object?
	if(isobject(y)){
		// yes, parse it out
		var obj = y;

		x = Object.keys(obj);
		y = x.map(function(k){ return obj[k];})
	}

	if(isstring(x[0])){
		valid = !isNaN(parseFloat(x[0]));
		x = valid ? x.map(parseFloat) : x;
	}

	// from here:
	// http://www.localwisdom.com/blog/2014/01/get-trend-line-javascript-graph-linear-regression/
	var lr = {};
	var n = y.length;
	var sum_x = 0;
	var sum_y = 0;
	var sum_xy = 0;
	var sum_xx = 0;
	var sum_yy = 0;

	for (var i = 0; i < y.length; i++) {

		sum_x += x[i];
		sum_y += y[i];
		sum_xy += (x[i]*y[i]);
		sum_xx += (x[i]*x[i]);
		sum_yy += (y[i]*y[i]);
	}

	lr['slope'] = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
	lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
	lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);

	return lr;
}

var d = function(a, b){ return a > b ? 1 : a < b ? -1 : 0;};

dataship.util.insert = function insert(arr, el){
	var index = binarySearch(arr, el, d);
	arr.splice(index, 0, el);

	return arr;
};

var binarySearch = dataship.util.bs = function binarySearch(arr, el, comparator) {

	var m = 0;
	var n = arr.length - 1;
	while (m <= n) {
		var k = (n + m) >> 1;
		var cmp = comparator(el, arr[k]); // comparator(arr[k], el);
		if (cmp > 0) {
			m = k + 1;
		} else if(cmp < 0) {
			n = k - 1;
		} else {
			return k;
		}
	}

	return m;
}

function defaultComparator() {
	var stringMode;
	return function(v,search){

		if(stringMode === undefined){
			stringMode = false;
			if(typeof search === 'string' || typeof v === "string"){
				stringMode = true;
			}
		}

		if(stringMode) v = v+'';

		return v > search ? 1 : v < search ? -1 : 0;
	};
}

}(typeof module === 'object' ? (GLOBAL) : (window)));
