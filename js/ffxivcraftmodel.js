require('./String.js');

function Logger() {
    this.log = function(myString) {
        var args = Array.prototype.slice.call(arguments, 1);
        console.log(String.prototype.sprintf.apply(myString, args));
    }
}

function Crafter(cls, level, craftsmanship, control, craftPoints, actions) {
    this.cls = cls;
    this.craftsmanship = craftsmanship;
    this.control = control;
    this.craftPoints = craftPoints;
    this.level = level;
    if (actions === null) {
        this.actions = [];
    }
    else {
        this.actions = actions;
    }
}

function Recipe(level, difficulty, durability, startQuality, maxQuality) {
    this.level = level;
    this.difficulty = difficulty;
    this.durability = durability;
    this.startQuality = startQuality;
    this.maxQuality = maxQuality;
}

function Synth(crafter, recipe, maxTrickUses, useConditions) {
    this.crafter = crafter;
    this.recipe = recipe;
    this.maxTrickUses = maxTrickUses;
    this.useConditions = useConditions;
    this.CalculateBaseProgressIncrease = function(levelDifference, craftsmanship) {
        var levelCorrectionFactor = 0;

        if ((-5 <= levelDifference) && (levelDifference <= 0)) {
            levelCorrectionFactor = 0.10 * levelDifference;
        }
        else if ((0 < levelDifference) && (levelDifference <= 5)) {
            levelCorrectionFactor = 0.05 * levelDifference;
        }
        else if ((5 < levelDifference) && (levelDifference <= 15)) {
            levelCorrectionFactor = 0.022 * levelDifference + 0.15;
        }
        else {
            levelCorrectionFactor = 0.0033 * levelDifference + 0.43;
        }

        var baseProgress = 0.21 * craftsmanship + 1.6;
        var levelCorrectedProgress = baseProgress * (1 + levelCorrectionFactor);

        return Math.round(levelCorrectedProgress, 0);

    };

    this.CalculateBaseQualityIncrease = function(levelDifference, control) {
        var levelCorrectionFactor = 0;

        if ((-5 <= levelDifference) && (levelDifference <= 0)) {
            levelCorrectionFactor = 0.05 * levelDifference;
        }
        else {
            levelCorrectionFactor = 0;
        }

        var baseQuality = 0.36 * control + 34;
        var levelCorrectedQuality = baseQuality * (1 + levelCorrectionFactor);

        return Math.round(levelCorrectedQuality, 0);

    };

}


function Action(shortName, name, durabilityCost, cpCost, successProbability, qualityIncreaseMultiplier, progressIncreaseMultiplier, aType, activeTurns, cls, level) {
    this.shortName = shortName;
    this.name = name;
    this.durabilityCost = durabilityCost;
    this.cpCost = cpCost;
    this.successProbability = successProbability;
    this.qualityIncreaseMultiplier = qualityIncreaseMultiplier;
    this.progressIncreaseMultiplier = progressIncreaseMultiplier;
    this.type = aType;

    if (aType != 'immediate') {
        this.activeTurns = activeTurns;      // Save some space
    }
    else {
        this.activeturns = 1;
    }

    this.cls = cls;
    this.level = level;

}

function isActionEq(action1, action2) {
    if (action1.name === action2.name) {
        return true;
    }
    else {
        return false;
    }
}

function isActionNe(action1, action2) {
    if (action1.name !== action2.name) {
        return true;
    }
    else {
        return false;
    }
}

function EffectTracker() {
    this.countUps = {};
    this.countDowns = {};
}

function State(step, action, durabilityState, cpState, qualityState, progressState, wastedActions, progressOk, cpOk, durabilityOk, trickOk, crossClassActionList) {
    this.step = step;
    this.action = action;
    this.durabilityState = durabilityState;
    this.cpState = cpState;
    this.qualityState = qualityState;
    this.progressState = progressState;
    this.wastedActions = wastedActions;
    this.progressOk = progressOk;
    this.cpOk = cpOk;
    this.durabilityOk = durabilityOk;
    this.trickOk = trickOk;
    if (crossClassActionList === null) {
        this.crossClassActionList = [];
    }
    else {
        this.crossClassActionList = crossClassActionList;
    }

}

function simSynth(individual, synth, verbose, debug, logOutput) {
    verbose = verbose !== undefined ? verbose : true;
    debug = debug !== undefined ? debug : false;
    logOutput = logOutput !== undefined ? logOutput : null;

    var logger = new Logger();

    // State tracking
    var durabilityState = synth.recipe.durability;
    var cpState = synth.crafter.craftPoints;
    var progressState = 0;
    var qualityState = synth.recipe.startQuality;
    var stepCount = 0;
    var wastedActions = 0;
    var effects = new EffectTracker();
    var trickUses = 0;
    var crossClassActionList = [];

    // Conditions
    var pGood = 0.23;
    var pExcellent = 0.01;
    var pPoor = pExcellent;

    // Step 1 is always normal
    var ppGood = 0;
    var ppExcellent = 0;
    var ppPoor = 0;
    var ppNormal = 1 - (pGood + pExcellent + pPoor);

    // End state checks
    var progressOk = false;
    var cpOk = false;
    var durabilityOk = false;
    var trickOk = false;

    if (individual === null) {
        return new State(stepCount, '', durabilityState, cpState, qualityState, progressState,
                           wastedActions, progressOk, cpOk, durabilityOk, trickOk, crossClassActionList);
    }

    if (verbose) {
        logger.log('%-2s %20s %-5s %-5s %-5s %-5s %-5s' , '#', 'Action', 'DUR', 'CP', 'EQUA', 'EPRG', 'WAC');
        logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f', stepCount, '', durabilityState, cpState, qualityState, progressState, wastedActions);

    }

    if (debug) {
        logger.log('%-2s %20s %-5s %-5s %-5s %-5s %-5s %-5s %-5s %-5s %-5s %-5s', '#', 'Action', 'DUR', 'CP', 'EQUA', 'EPRG', 'WAC', 'IQ', 'CTL', 'QINC', 'BPRG', 'BQUA');
        logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f %5.1f %5.0f %5.0f', stepCount, '', durabilityState, cpState, qualityState, progressState, wastedActions, 0, synth.crafter.control, 0);
    }

    for (var i = 0; i < individual.length; i++) {
        var action = individual[i];

        // Occur regardless of dummy actions
        //==================================
        stepCount += 1;

        // Add effect modifiers
        var craftsmanship = synth.crafter.craftsmanship;
        var control = synth.crafter.control;
        if (innerQuiet.name in effects.countUps) {
            control *= (1 + 0.2 * effects.countUps[innerQuiet.name]);
        }

        if (innovation.name in effects.countDowns) {
            control *= 1.5;
        }

        var levelDifference = synth.crafter.level - synth.recipe.level;
        if (ingenuity2.name in effects.countDowns) {
            levelDifference = 3;
        }
        else if (ingenuity.name in effects.countDowns) {
            levelDifference = 0;
        }

        var successProbability = action.successProbability;
        if (steadyHand2.name in effects.countDowns) {
            successProbability = action.successProbability + 0.3;        // Assume 2 always overrides 1
        }
        else if (steadyHand.name in effects.countDowns) {
            successProbability = action.successProbability + 0.2;
        }
        else {
            successProbability = action.successProbability;
        }
        successProbability = Math.min(successProbability, 1);

        var qualityIncreaseMultiplier = action.qualityIncreaseMultiplier;
        if (greatStrides.name in effects.countDowns) {
            qualityIncreaseMultiplier *= 2;
        }

        // Condition Calculation
        if (synth.useConditions) {
            qualityIncreaseMultiplier *= (1*ppNormal + 1.5*ppGood + 4*ppExcellent + 0.5*ppPoor);
        }

        // Calculate final gains / losses
        var bProgressGain = action.progressIncreaseMultiplier * synth.CalculateBaseProgressIncrease(levelDifference, craftsmanship);
        if (isActionEq(action, flawlessSynthesis)) {
            bProgressGain = 40;
        }
        else if (isActionEq(action, pieceByPiece)) {
            bProgressGain = (synth.recipe.difficulty - progressState)/3;
        }
        var progressGain = successProbability * bProgressGain;

        var bQualityGain = qualityIncreaseMultiplier * synth.CalculateBaseQualityIncrease(levelDifference, control);
        var qualityGain = successProbability * bQualityGain;
        if (isActionEq(action, byregotsBlessing)) {
            qualityGain *= (1 + 0.2 * effects.countUps[innerQuiet.name]);
        }

        var durabilityCost = action.durabilityCost;
        if ((wasteNot.name in effects.countDowns) || (wasteNot2.name in effects.countDowns)) {
            durabilityCost = 0.5 * action.durabilityCost;
        }

        // Occur if a wasted action
        //==================================
        if (((progressState >= synth.recipe.difficulty) || (durabilityState <= 0)) && (action != dummyAction)) {
            wastedActions += 1;
        }

        // Occur if not a wasted action
        //==================================
        else {
            // State tracking
            progressState += progressGain;
            qualityState += qualityGain;
            durabilityState -= durabilityCost;
            cpState -= action.cpCost;

            // Effect management
            //==================================
            // Special Effect Actions
            if (isActionEq(action, mastersMend)) {
                durabilityState += 30;
            }

            if (isActionEq(action, mastersMend2)) {
                durabilityState += 60;
            }

            if ((manipulation.name in effects.countDowns) && (durabilityState > 0)) {
                durabilityState += 10;
            }

            if ((comfortZone.name in effects.countDowns) && (cpState > 0)) {
                cpState += 8;
            }

            if ((isActionEq(action, rumination)) && (cpState > 0)) {
                if ((innerQuiet.name in effects.countUps) && (effects.countUps[innerQuiet.name] > 0)) {
                    cpState += (21 * effects.countUps[innerQuiet.name] - Math.pow(effects.countUps[innerQuiet.name],2) + 10)/2;
                    delete effects.countUps[innerQuiet.name];
                }
                else {
                    wastedActions += 1;
                }
            }

            if (isActionEq(action, byregotsBlessing)) {
                if (innerQuiet.name in effects.countUps) {
                    delete effects.countUps[innerQuiet.name];
                }
                else {
                    wastedActions += 1;
                }
            }

            if ((action.qualityIncreaseMultiplier > 0) && (greatStrides.name in effects.countDowns)) {
                delete effects.countDowns[greatStrides.name];
            }

            if ((isActionEq(action, tricksOfTheTrade)) && (cpState > 0)) {
                trickUses += 1;
                cpState += 20;
            }

            // Conditions
            if (synth.useConditions) {
                ppPoor = ppExcellent;
                ppGood = pGood * ppNormal;
                ppExcellent = pExcellent * ppNormal;
                ppNormal = 1 - (ppGood + ppExcellent + ppPoor);
            }

            // Decrement countdowns
            for (var countDown in effects.countDowns) {
                effects.countDowns[countDown] -= 1;
                if (effects.countDowns[countDown] === 0) {
                    delete effects.countDowns[countDown];
                }
            }

            // Increment countups
            if ((action.qualityIncreaseMultiplier > 0) && (innerQuiet.name in effects.countUps)) {
                effects.countUps[innerQuiet.name] += 1 * successProbability;
            }

            // Initialize new effects after countdowns are managed to reset them properly
            if (action.type === 'countup') {
                effects.countUps[action.name] = 0;
            }

            if (action.type === 'countdown') {
                effects.countDowns[action.name] = action.activeTurns;
            }

            // Sanity checks for state variables
            durabilityState = Math.min(durabilityState, synth.recipe.durability);
            cpState = Math.min(cpState, synth.crafter.craftPoints);

            // Count cross class actions
            if (!((action.cls === 'All') || (action.cls === synth.crafter.cls) || (action in crossClassActionList))) {
                crossClassActionList[crossClassActionList.length] = action;
            }

        }

        if (verbose) {
            logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f', stepCount, action.name, durabilityState, cpState, qualityState, progressState, wastedActions);
        }

        if (debug) {
            var iqCnt = 0;
            if (innerQuiet.name in effects.countUps) {
                iqCnt = effects.countUps[innerQuiet.name];
            }
            logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f %5.1f %5.0f %5.0f %5.0f %5.0f', stepCount, action.name, durabilityState, cpState, qualityState, progressState, wastedActions, iqCnt, control, qualityGain, bProgressGain, bQualityGain);
        }

    }

    // Penalise failure outcomes
    if (progressState >= synth.recipe.difficulty) {
        progressOk = true;
    }

    if (cpState >= 0) {
        cpOk = true;
    }

    if ((durabilityState >= 0) && (progressState >= synth.recipe.difficulty)) {
        durabilityOk = true;
    }

    if (trickUses <= synth.maxTrickUses) {
        trickOk = true;
    }

    var lastIndividual = individual[individual.length-1];

    var finalState = new State(stepCount, lastIndividual.name, durabilityState, cpState, qualityState, progressState,
                       wastedActions, progressOk, cpOk, durabilityOk, trickOk, crossClassActionList);

    if (verbose) {
        logger.log('Progress Check: %s, Durability Check: %s, CP Check: %s, Tricks Check: %s, Cross Class Skills: %d', progressOk, durabilityOk, cpOk, trickOk, crossClassActionList.length);
    }

    if (debug) {
        logger.log('Progress Check: %s, Durability Check: %s, CP Check: %s, Tricks Check: %s', progressOk, durabilityOk, cpOk, trickOk);
    }

    return finalState;
}

function MonteCarloSynth(individual, synth, verbose, debug, logOutput) {
    verbose = verbose !== undefined ? verbose : true;
    debug = debug !== undefined ? debug : false;
    logOutput = logOutput !== undefined ? logOutput : null;

    var logger = new Logger();

    // State Tracking
    var durabilityState = synth.recipe.durability;
    var cpState = synth.crafter.craftPoints;
    var progressState = 0;
    var qualityState = synth.recipe.startQuality;
    var stepCount = 0;
    var wastedActions = 0;
    var effects = new EffectTracker();
    var maxTricksUses = synth.maxTrickUses;
    var trickUses = 0;
    var crossClassActionList = [];
    var condition = 'Normal';

    // Strip Tricks of the Trade from individual
    var tempIndividual = [];
    for (var i=0; i < individual.length; i++) {
        if (isActionNe(tricksOfTheTrade, individual[i])) {
            tempIndividual[tempIndividual.length] = individual[i];
        }
    }
    individual = tempIndividual;

    // Conditions
    var pGood = 0.23;
    var pExcellent = 0.01;

    // End state checks
    var progressOk = false;
    var cpOk = false;
    var durabilityOk = false;
    var trickOk = false;

    if (individual === null) {
        return new State(stepCount, '', durabilityState, cpState, qualityState, progressState,
                           wastedActions, progressOk, cpOk, durabilityOk, trickOk, crossClassActionList);
    }

    if (verbose) {
        logger.log('%-2s %20s %-5s %-5s %-5s %-5s %-5s', '#', 'Action', 'DUR', 'CP', 'EQUA', 'EPRG', 'WAC');
        logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f', stepCount, '', durabilityState, cpState, qualityState, progressState, wastedActions);

    }

    if (debug) {
        logger.log('%-2s %20s %-5s %-5s %-5s %-5s %-5s %-5s %-5s %-5s %-5s %-5s', '#', 'Action', 'DUR', 'CP', 'EQUA', 'EPRG', 'WAC', 'IQ', 'CTL', 'QINC', 'BPRG', 'BQUA');
        logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f %5.1f %5.0f %5.0f', stepCount, '', durabilityState, cpState, qualityState, progressState, wastedActions, 0, synth.crafter.control, 0);
    }

    for (var i=0; i < individual.length; i++) {
        var action = individual[i];
        stepCount += 1;

        // Add effect modifiers
        var craftsmanship = synth.crafter.craftsmanship;
        var control = synth.crafter.control;
        if (innerQuiet.name in effects.countUps) {
            control *= (1 + 0.2 * effects.countUps[innerQuiet.name]);
        }

        if (innovation.name in effects.countDowns) {
            control *= 1.5;
        }

        var levelDifference = synth.crafter.level - synth.recipe.level;
        if (ingenuity2.name in effects.countDowns) {
            levelDifference = 3;
        }
        else if (ingenuity.name in effects.countDowns) {
            levelDifference = 0;
        }

        if (steadyHand2.name in effects.countDowns) {
            successProbability = action.successProbability + 0.3;        // Assume 2 always overrides 1
        }
        else if (steadyHand.name in effects.countDowns) {
            successProbability = action.successProbability + 0.2;
        }
        else {
            successProbability = action.successProbability;
        }
        var successProbability = Math.min(successProbability, 1);

        var qualityIncreaseMultiplier = action.qualityIncreaseMultiplier;
        if (greatStrides.name in effects.countDowns) {
            qualityIncreaseMultiplier *= 2;
        }

        // Condition Calculation
        if (condition === 'Excellent') {
            condition = 'Poor';
            qualityIncreaseMultiplier *= 0.5;
        }
        else if (condition === 'Good' || condition === 'Poor') {
            condition = 'Normal';
        }
        else {
            var condRand = Math.random();
            if (0 <= condRand && condRand < pExcellent) {
                condition = 'Excellent';
                qualityIncreaseMultiplier *= 4;
            }
            else if (pExcellent <= condRand && condRand < (pExcellent + pGood)) {
                condition = 'Good';

                if (trickUses < maxTricksUses) {
                    // Assumes first N good actions will always be used for ToT
                    trickUses += 1;
                    cpState += 20;
                }
                else{
                    qualityIncreaseMultiplier *= 1.5;
                }
            }
            else {
                condition = 'Normal';
                qualityIncreaseMultiplier *= 1;
            }
        }

        // Calculate final gains / losses
        var success = 0;
        successRand = Math.random();
        if (0 <= successRand && successRand <= successProbability) {
            success = 1;
        }

        var bProgressGain = action.progressIncreaseMultiplier * synth.CalculateBaseProgressIncrease(levelDifference, craftsmanship);
        if (isActionEq(action, flawlessSynthesis)) {
            bProgressGain = 40;
        }
        else if (isActionEq(action, pieceByPiece)) {
            bProgressGain = (synth.recipe.difficulty - progressState)/3;
        }
        var progressGain = success * bProgressGain;

        var bQualityGain = qualityIncreaseMultiplier * synth.CalculateBaseQualityIncrease(levelDifference, control);
        var qualityGain = success * bQualityGain;
        if (isActionEq(action, byregotsBlessing)) {
            qualityGain *= (1 + 0.2 * effects.countUps[innerQuiet.name]);
        }

        var durabilityCost = action.durabilityCost;
        if (wasteNot.name in effects.countDowns || wasteNot2.name in effects.countDowns) {
            durabilityCost = 0.5 * action.durabilityCost;
        }

        // Occur if a dummy action
        //==================================
        if ((progressState >= synth.recipe.difficulty || durabilityState <= 0) && action != dummyAction) {
            wastedActions += 1;
        }

        // Occur if not a dummy action
        //==================================
        else {
            // State tracking
            progressState += Math.round(progressGain);
            qualityState += Math.round(qualityGain);
            durabilityState -= durabilityCost;
            cpState -= action.cpCost;

            // Effect management
            //==================================
            // Special Effect Actions
            if (isActionEq(action, mastersMend)) {
                durabilityState += 30;
            }

            if (isActionEq(action, mastersMend2)) {
                durabilityState += 60;
            }

            if (manipulation.name in effects.countDowns && durabilityState > 0) {
                durabilityState += 10;
            }

            if (comfortZone.name in effects.countDowns && cpState > 0) {
                cpState += 8;
            }

            if (isActionEq(action, rumination) && cpState > 0) {
                if (innerQuiet.name in effects.countUps && effects.countUps[innerQuiet.name] > 0) {
                    cpState += (21 * effects.countUps[innerQuiet.name] - Math.pow(effects.countUps[innerQuiet.name],2) + 10)/2;
                    delete effects.countUps[innerQuiet.name];
                }
                else {
                    wastedActions += 1;
                }
            }

            if (isActionEq(action, byregotsBlessing)) {
                if (innerQuiet.name in effects.countUps) {
                    delete effects.countUps[innerQuiet.name]
                }
                else {
                    wastedActions += 1;
                }
            }

            if (action.qualityIncreaseMultiplier > 0 && greatStrides.name in effects.countDowns) {
                delete effects.countDowns[greatStrides.name];
            }

            if (isActionEq(action, tricksOfTheTrade) && cpState > 0) {
                trickUses += 1;
                cpState += 20;
            }

            // Decrement countdowns
            for (countDown in effects.countDowns.keys) {
                effects.countDowns[countDown] -= 1;
                if (effects.countDowns[countDown] == 0) {
                    delete effects.countDowns[countDown];
                }
            }

            // Increment countups
            if (action.qualityIncreaseMultiplier > 0 && innerQuiet.name in effects.countUps) {
                effects.countUps[innerQuiet.name] += 1 * success;
            }

            // Initialize new effects after countdowns are managed to reset them properly
            if (action.type === 'countup') {
                effects.countUps[action.name] = 0;
            }

            if (action.type == 'countdown') {
                effects.countDowns[action.name] = action.activeTurns;
            }

            // Sanity checks for state variables
            durabilityState = Math.min(durabilityState, synth.recipe.durability);
            cpState = Math.min(cpState, synth.crafter.craftPoints);

            // Count cross class actions
            if (!((action.cls === 'All') || (action.cls === synth.crafter.cls) || (action in crossClassActionList))) {
                crossClassActionList[crossClassActionList.length] = action;
            }

        }

        if (verbose) {
            logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f', stepCount, action.name, durabilityState, cpState, qualityState, progressState, wastedActions);
        }

        if (debug) {
            var iqCnt = 0;
            if (innerQuiet.name in effects.countUps) {
                iqCnt = effects.countUps[innerQuiet.name];
            }
            logger.log('%2d %20s %5.0f %5.0f %5.1f %5.1f %5.0f %5.1f %5.0f %5.0f %5.0f %5.0f', stepCount, action.name, durabilityState, cpState, qualityState, progressState, wastedActions, iqCnt, control, qualityGain, bProgressGain, bQualityGain);
        }

    }

    // Penalise failure outcomes
    if (progressState >= synth.recipe.difficulty) {
        progressOk = true;
    }

    if (cpState >= 0) {
        cpOk = true;
    }

    if (durabilityState >= 0 && progressState >= synth.recipe.difficulty) {
        durabilityOk = true;
    }

    if (trickUses <= synth.maxTrickUses) {
        trickOk = true;
    }

    var finalState = new State(stepCount, individual[individual.length-1].name, durabilityState, cpState, qualityState, progressState,
                       wastedActions, progressOk, cpOk, durabilityOk, trickOk, crossClassActionList);

    if (verbose) {
        logger.log('Progress Check: %s, Durability Check: %s, CP Check: %s, Tricks Check: %s, Cross Class Skills: %d', progressOk, durabilityOk, cpOk, trickOk, crossClassActionList.length);
    }

    if (debug) {
        logger.log('Progress Check: %s, Durability Check: %s, CP Check: %s', progressOk, durabilityOk, cpOk);
    }

    return finalState
}

function MonteCarloSim(individual, synth, nRuns, seed, verbose, debug, logOutput) {
    seed = seed !== undefined ? seed : 0;
    verbose = verbose !== undefined ? verbose : false;
    debug = debug !== undefined ? debug : false;
    logOutput = logOutput !== undefined ? logOutput : null;

    var logger = new Logger();

    var finalStateTracker = []
    for (var i=0; i < nRuns; i++) {
        var runSynth = MonteCarloSynth(individual, synth, false, debug, logOutput);
        finalStateTracker[finalStateTracker.length] = runSynth

        if (verbose) {
            logger.log('%2d %-20s %5d %5d %5.1f %5.1f %5d', i, 'MonteCarlo', runSynth.durabilityState, runSynth.cpState, runSynth.qualityState, runSynth.progressState, runSynth.wastedActions);
        }
    }

    var avgDurability = getAverageProperty(finalStateTracker, 'durabilityState', nRuns);
    var avgCp = getAverageProperty(finalStateTracker, 'cpState', nRuns);
    var avgQuality = getAverageProperty(finalStateTracker, 'qualityState', nRuns);
    var avgProgress = getAverageProperty(finalStateTracker, 'progressState', nRuns);
    var avgQualityPercent = avgQuality/synth.recipe.maxQuality * 100;
    var avgHqPercent = hqPercentFromQuality(avgQualityPercent);

    logger.log('%-2s %20s %-5s %-5s %-5s %-5s %-5s','', '', 'DUR', 'CP', 'QUA', 'PRG', 'HQ%');
    logger.log('%2s %-20s %5.0f %5.0f %5.1f %5.1f %5d', '##', 'Expected Value: ', avgDurability, avgCp, avgQuality, avgProgress, avgHqPercent);

    var minDurability = getMinProperty(finalStateTracker, 'durabilityState');
    var minCp = getMinProperty(finalStateTracker, 'cpState');
    var minQuality = getMinProperty(finalStateTracker, 'qualityState');
    var minProgress = getMinProperty(finalStateTracker, 'progressState');
    var minQualityPercent = minQuality/synth.recipe.maxQuality * 100;
    var minHqPercent = hqPercentFromQuality(minQualityPercent);

    logger.log('%2s %-20s %5.0f %5.0f %5.1f %5.1f %5d', '##', 'Min Value: ', minDurability, minCp, minQuality, minProgress, minHqPercent);
}

function getAverageProperty(stateArray, propName, nRuns) {
    var sumProperty = 0;
    for (var i=0; i < stateArray.length; i++) {
        sumProperty += stateArray[i][propName];
    }
    var avgProperty = sumProperty/nRuns;

    return avgProperty;
}

function getMinProperty(stateArray, propName) {
    var minProperty = null;
    for (var i=0; i < stateArray.length; i++) {
        if (minProperty === null) {
            minProperty = stateArray[i][propName];
        }
        else {
            if (minProperty > stateArray[i][propName]) {
                minProperty = stateArray[i][propName];
            }
        }
    }
    return minProperty;
}

function qualityFromHqPercent(hqPercent) {
    var x = hqPercent;
    var qualityPercent = -5.6604E-6 * Math.pow(x, 4) + 0.0015369705 * Math.pow(x, 3) - 0.1426469573 * Math.pow(x, 2) + 5.6122722959 * x - 5.5950384565;

    return qualityPercent;
}

function hqPercentFromQuality(qualityPercent) {
    var hqPercent = 1;
    if (qualityPercent === 0) {
        hqPercent = 1;
    }
    else if (qualityPercent >= 100) {
        hqPercent = 100;
    }
    else {
        while (qualityFromHqPercent(hqPercent) < qualityPercent && hqPercent < 100) {
            hqPercent += 1;
        }
    }
    return hqPercent;
}

function evalSeq(individual, mySynth, penaltyWeight) {
    penaltyWeight = penaltyWeight!== undefined ? penaltyWeight : 10000;

    var result = simSynth(individual, mySynth, false, false);
    var penalties = 0;
    var fitness = 0;

    // Sum the constraint violations
    penalties += result.wastedActions;

    if (!result.durabilityOk) {
       penalties += 1;
    }

    if (!result.progressOk) {
        penalties += 1;
    }

    if (!result.cpOk) {
        penalties += 1;
    }

    if (!result.trickOk) {
        penalties += 1;
    }

    fitness += result.qualityState;
    fitness -= penaltyWeight * penalties;

    return fitness;
}

// Actions
//parameters: shortName,  name, durabilityCost, cpCost, successProbability, qualityIncreaseMultiplier, progressIncreaseMultiplier, aType, activeTurns, cls, level
var basicSynth = new Action(        'basicSynth',           'Basic Synthesis',      10,  0,   0.9, 0.0, 1.0, 'immediate',   1,  'All',          1);
var standardSynthesis = new Action( 'standardSynthesis',    'Standard Synthesis',   10,  15,  0.9, 0.0, 1.5, 'immediate',   1,  'All',          31);
var carefulSynthesis = new Action(  'carefulSynthesis',     'Careful Synthesis',    10,  0,   1.0, 0.0, 0.9, 'immediate',   1,  'Weaver',       15);
var carefulSynthesis2 = new Action( 'carefulSynthesis2',    'Careful Synthesis II', 10,  0,   1.0, 0.0, 1.2, 'immediate',   1,  'Weaver',       50);
var rapidSynthesis = new Action(    'rapidSynthesis',       'Rapid Synthesis',      10,  0,   0.5, 0.0, 2.5, 'immediate',   1,  'Armorer',      15);
var flawlessSynthesis = new Action( 'flawlessSynthesis',    'Flawless Synthesis',   10,  15,  0.9, 0.0, 1.0, 'immediate',   1,  'Goldsmith',    37);
var pieceByPiece = new Action(      'pieceByPiece',         'Piece By Piece',       10,  15,  0.9, 0.0, 1.0, 'immediate',   1,  'Armorer',      50);

var basicTouch = new Action(        'basicTouch',           'Basic Touch',          10,  18,  0.7, 1.0, 0.0, 'immediate',   1,  'All',          5);
var standardTouch = new Action(     'standardTouch',        'Standard Touch',       10,  32,  0.8, 1.25,0.0, 'immediate',   1,  'All',          18);
var advancedTouch = new Action(     'advancedTouch',        'Advanced Touch',       10,  48,  0.9, 1.5, 0.0, 'immediate',   1,  'All',          43);
var hastyTouch = new Action(        'hastyTouch',           'Hasty Touch',          10,  0,   0.5, 1.0, 0.0, 'immediate',   1,  'Culinarian',   15);
var byregotsBlessing = new Action(  'byregotsBlessing',     'Byregot\'s Blessing',  10,  24,  0.9, 1.0, 0.0, 'immediate',   1,  'Carpenter',    50);

var mastersMend = new Action(       'mastersMend',          'Master\'s Mend',       0,   92,  1.0, 0.0, 0.0, 'immediate',   1,  'All',          7);
var mastersMend2 = new Action(      'mastersMend2',         'Master\'s Mend II',    0,   160, 1.0, 0.0, 0.0, 'immediate',   1,  'All',          25);
var rumination = new Action(        'rumination',           'Rumination',           0,   0,   1.0, 0.0, 0.0, 'immediate',   1,  'Carpenter',    15);
var tricksOfTheTrade = new Action(  'tricksOfTheTrade',     'Tricks Of The Trade',  0,   0,   1.0, 0.0, 0.0, 'immediate',   1,  'Alchemist',    15);

var innerQuiet = new Action(        'innerQuiet',           'Inner Quiet',          0,   18,  1.0, 0.0, 0.0, 'countup',     1,  'All',          11);
var manipulation = new Action(      'manipulation',         'Manipulation',         0,   88,  1.0, 0.0, 0.0, 'countdown',   3,  'Goldsmith',    15);
var comfortZone = new Action(       'comfortZone',          'Comfort Zone',         0,   66,  1.0, 0.0, 0.0, 'countdown',   10, 'Alchemist',    50);
var steadyHand = new Action(        'steadyHand',           'Steady Hand',          0,   22,  1.0, 0.0, 0.0, 'countdown',   5,  'All',          9);
var steadyHand2 = new Action(       'steadyHand2',          'Steady Hand II',       0,   25,  1.0, 0.0, 0.0, 'countdown',   5,  'Culinarian',   37);
var wasteNot = new Action(          'wasteNot',             'Waste Not',            0,   56,  1.0, 0.0, 0.0, 'countdown',   4,  'Leatherworker',15);
var wasteNot2 = new Action(         'wasteNot2',            'Waste Not II',         0,   98,  1.0, 0.0, 0.0, 'countdown',   8,  'Leatherworker',50);
var innovation = new Action(        'innovation',           'Innovation',           0,   18,  1.0, 0.0, 0.0, 'countdown',   3,  'Goldsmith',    50);
var greatStrides = new Action(      'greatStrides',         'Great Strides',        0,   32,  1.0, 0.0, 0.0, 'countdown',   3,  'All',          21);
var ingenuity = new Action(         'ingenuity',            'Ingenuity',            0,   24,  1.0, 0.0, 0.0, 'countdown',   5,  'Blacksmith',   15);
var ingenuity2 = new Action(        'ingenuity2',           'Ingenuity II',         0,   32,  1.0, 0.0, 0.0, 'countdown',   5,  'Blacksmith',   50);


// Test objects
//cls, level, craftsmanship, control, craftPoints, actions
var myWeaverActions = [basicSynth];
var myWeaver = new Crafter('Weaver', 20, 119, 117, 243, myWeaverActions);
var initiatesSlops = new Recipe(20,74,70,0,1053);
var mySynth = new Synth(myWeaver, initiatesSlops, maxTrickUses=1, useConditions=true);
var actionSequence = [innerQuiet, steadyHand, wasteNot, basicSynth, hastyTouch, hastyTouch, hastyTouch, steadyHand, hastyTouch, tricksOfTheTrade, standardTouch, standardTouch, standardTouch, tricksOfTheTrade, rumination, mastersMend, hastyTouch, basicSynth, basicTouch, basicSynth];

simSynth(actionSequence, mySynth, false, true);
MonteCarloSynth(actionSequence, mySynth, false, true);
MonteCarloSim(actionSequence, mySynth, 500);
evalSeq(actionSequence, mySynth);