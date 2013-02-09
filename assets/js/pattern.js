/*global window: true*/
(function (App) {
	"use strict";

	var
		/**
		 * Storage for the single App.Pattern instance once it's initialized
		 * @type {App.Pattern}
		 */
		instance,

		events = App.eventDispatcher;


	/**
	 * Singleton pattern module, simply holds the on/off status for every step
	 * on every track.
	 *
	 */
	App.Pattern = function () {

		// ## Private properties

		var

			/**
			 * Array of objects containing channelId and step array for each channel
			 * @type {Array}
			 */
			patterns = [],

			/**
			 * Keep a quick channelId: patterns array index lookup handy
			 * This is for getChannelById lookups, only updated when channels are
			 * removed or added.
			 * @type {Object}
			 */
			channelIndex = {},

			/**
			 * Current progress through the pattern, as a step index
			 * @type {Number}
			 */
			currentStep = -1,

			/**
			 * Number of steps we want for each channel, for populating.
			 * @type {Number}
			 */
			stepsPerChannel = 16,

			/**
			 * Reference to self for in functions
			 * @type {App.Pattern}
			 */
			self = this;


		// Force instantiation before continuing

		if (this.constructor !== App.Pattern) {
			return new App.Pattern();
		}


		// ## Private methods

		/**
		 * Ensures the channelIndex lookup dictionary is up to date with
		 * the patterns array
		 */
		function rehashChannelIndex() {

			var i;

			// Empty current index
			channelIndex = {};

			// Fill with current data
			for (i = 0; i < patterns.length; i += 1) {
				channelIndex[patterns[i].channelId] = i;
			}
		}


		/**
		 * Add or remove steps from each channel in patterns to make it match
		 * desiredStepcount
		 *
		 * @param  {Number} desiredStepCount
		 */
		function correctStepCount(desiredStepCount) {

			var i, j;

			// Already correct?
			if (stepsPerChannel === desiredStepCount) { return; }

			// More needed than we currently have:
			if (desiredStepCount > stepsPerChannel) {

				for (i = 0; i < desiredStepCount - stepsPerChannel; i += 1) {
					for (j = 0; j < patterns.length; j += 1) {
						patterns[j].steps.push(false);
					}
				}

			} else { // Need less than we have now

				for (j = 0; j < patterns.length; j += 1) {
					patterns[j].steps = patterns[j].steps.slice(0, desiredStepCount);
				}
			}

			// Update stepsPerChannel
			stepsPerChannel = desiredStepCount;
		}


		/**
		 * Retrieve a channel object from the pattern array by its unique ID
		 *
		 * @param  {Number} channelId
		 * @return {Object}
		 * @note This only returns a flat object from the patterns array, not an
		 * App.Channel object. No tight coupling here.
		 */
		function getChannelById(channelId) {

			if (typeof channelIndex[channelId] === 'undefined') { return false; }

			if (typeof patterns[channelIndex[channelId]] === 'undefined') {
				return false;
			}

			return patterns[channelIndex[channelId]];
		}


		/**
		 * Add a channel to the patterns array and fill it up with steps
		 * (as many as stepsPerChannel indicates)
		 *
		 * @param {Number} channelId
		 */
		function addChannel(channelId) {

			var
				channel = getChannelById(channelId) || {channelId: channelId},
				isNew = typeof channel.steps === 'undefined',
				i;

			channel.steps = [];

			// Fill with steps that are off
			for (i = 0; i < stepsPerChannel; i += 1) {
				channel.steps.push(false);
			}

			// If this is a newly created channel, add it to patterns
			if (isNew) {
				patterns.push(channel);
				rehashChannelIndex();
			}
		}


		/**
		 * Remove a channel from the patterns array
		 *
		 * @param  {Number} channelId
		 */
		function removeChannel(channelId) {

			var channelPatternIndex = channelIndex[channelId];

			// Not found?
			if (typeof channelPatternIndex === 'undefined') { return; }

			// Remove from array
			patterns.splice(channelPatternIndex, 1);

			rehashChannelIndex();
		}


		/**
		 * Set on/off status of a step in the pattern
		 *
		 * @param {Number} channelId
		 * @param {Number} stepIndex
		 * @param {Boolean} on
		 */
		function stepToggled(channelId, stepIndex, on) {

			var channel = getChannelById(channelId);

			if (!channel) { return; }

			// Make sure we don't accidentally create new steps through toggle
			if (typeof channel.steps[stepIndex] === 'undefined') { return; }

			// Cast to boolean just in case
			channel.steps[stepIndex] = !!on;
		}


		/**
		 * Clears all the steps of every channel
		 */
		function clearPattern() {

			var
				i,
				emptyPattern = [];

			for (i = 0; i < stepsPerChannel; i += 1) {
				emptyPattern.push(false);
			}

			for (i = 0; i < patterns.length; i += 1) {
				// Slice for shallow copy
				patterns[i].steps = emptyPattern.slice(0, stepsPerChannel);
			}
		}


		/**
		 * Resets the current step back to the beginning
		 */
		function resetCurrentStep() {
			currentStep = -1;
		}


		/**
		 * Every step tick, advance currentStep and trigger any channels that have
		 * a step that's on
		 */
		function tick() {

			var i;

			currentStep += 1;

			if (currentStep > (stepsPerChannel - 1)) {
				currentStep = 0;
			}

			events.trigger('step.tick', currentStep);

			for (i = 0; i < patterns.length; i += 1) {
				if (patterns[i].steps[currentStep]) {
					events.trigger('channel.triggered.channel-' + patterns[i].channelId);
				}
			}
		}


		// ## Initialization

		// Store instance in this file's closure for retrieval in case it gets
		// overridden.
		instance = this;
		App.pattern = instance;


		// Subscribe to some mothereffin events
		events.subscribe('steps-per-channel.update', correctStepCount);
		events.subscribe('channel.added',  addChannel);
		events.subscribe('channel.removed', removeChannel);
		events.subscribe('ui.step.toggled', stepToggled);
		events.subscribe('ui.pattern.clear', clearPattern);
		events.subscribe('ui.transport.reset', resetCurrentStep);
		events.subscribe('tempo.step', tick);


		/**
		 * Overriding constructor for Pattern, so it returns the existing instance.
		 * Also make App.pattern point at the instance
		 *
		 * @return {App.Pattern}
		 */
		App.Pattern = function () {

			if (App.pattern !== instance) {
				App.pattern = instance;
			}

			return instance;
		};
	};

}(window.STEPSEQUENCER));