//noinspection ThisExpressionReferencesGlobalObjectJS
if (this.ALGORITHMS === undefined) ALGORITHMS = {};

ALGORITHMS['eaComplex'] = {
  setup: function (population, toolbox, hof) {
    // initialize functions
    toolbox.register("mate", yagal_tools.cxRandomSubSeq, 3);
    toolbox.register("mutate1", yagal_tools.mutRandomSubSeq, 3, toolbox.randomActionSeq);
    toolbox.register("mutate2", yagal_tools.mutSwap);
    toolbox.register("mutate", yagal_tools.randomMutation, [toolbox.mutate1, toolbox.mutate2]);
    toolbox.register("selectParents", yagal_tools.selTournament, 7);
    toolbox.register("selectOffspring", yagal_tools.selBest);
    toolbox.register("selectSurvivors", yagal_tools.selBest);
    //toolbox.register("setInitialGuess", yagal_tools.setStart);

    // evaluate fitness of starting population
    var fitnessesValues = toolbox.map(toolbox.evaluate, population);
    for (var i = 0; i < population.length; i++) {
      population[i].fitness.setValues(fitnessesValues[i]);
    }

    if (hof !== undefined) {
      hof.update(population);
    }
  },
  gen: function (population, toolbox, hof) {
    // Split population in 4

    var pop1 = population.slice(population.length / 2)
    var pop2 = pop1.splice(pop1.length / 2)
    var pop3 = population.slice(0, population.length / 2)
    var pop4 = pop3.splice(pop3.length / 2)

    // select parents
    var parents1 = toolbox.selectParents(pop1.length / 2, pop1);
    var parents2 = toolbox.selectParents(pop2.length / 2, pop2);
    var parents3 = toolbox.selectParents(pop3.length / 2, pop3);
    var parents4 = toolbox.selectParents(pop4.length / 2, pop4);

    // breed offspring
    var offspring1 = yagal_algorithms.varAnd(parents1, toolbox, 0.5, 0.2);
    var offspring2 = yagal_algorithms.varAnd(parents2, toolbox, 0.5, 0.2);
    var offspring3 = yagal_algorithms.varAnd(parents3, toolbox, 0.5, 0.2);
    var offspring4 = yagal_algorithms.varAnd(parents4, toolbox, 0.5, 0.2);

    function isFitnessInvalid(ind) {
      return !ind.fitness.valid();
    }

    // My code is bad
    // evaluate offspring with invalid fitness 1
    var invalidInd1 = offspring1.filter(isFitnessInvalid);
    var fitnessesValues1 = toolbox.map(toolbox.evaluate, invalidInd1);
    for (var j = 0; j < invalidInd1.length; j++) {
      invalidInd1[j].fitness.setValues(fitnessesValues1[j]);
    }
    // My code is bad
    // evaluate offspring with invalid fitness 2
    var invalidInd2 = offspring2.filter(isFitnessInvalid);
    var fitnessesValues2 = toolbox.map(toolbox.evaluate, invalidInd2);
    for (var j = 0; j < invalidInd2.length; j++) {
      invalidInd2[j].fitness.setValues(fitnessesValues2[j]);
    }// My code is bad
    // evaluate offspring with invalid fitness 3
    var invalidInd3 = offspring3.filter(isFitnessInvalid);
    var fitnessesValues3 = toolbox.map(toolbox.evaluate, invalidInd3);
    for (var j = 0; j < invalidInd3.length; j++) {
      invalidInd3[j].fitness.setValues(fitnessesValues3[j]);
    }// My code is bad
    // evaluate offspring with invalid fitness 4
    var invalidInd4 = offspring4.filter(isFitnessInvalid);
    var fitnessesValues4 = toolbox.map(toolbox.evaluate, invalidInd4);
    for (var j = 0; j < invalidInd4.length; j++) {
      invalidInd4[j].fitness.setValues(fitnessesValues4[j]);
    }

    // select offspring
    offspring1 = toolbox.selectOffspring(offspring1.length / 2, offspring1);
    offspring2 = toolbox.selectOffspring(offspring2.length / 2, offspring2);
    offspring3 = toolbox.selectOffspring(offspring3.length / 2, offspring3);
    offspring4 = toolbox.selectOffspring(offspring4.length / 2, offspring4);

    // select survivors
    var survivors1 = toolbox.selectSurvivors(pop1.length - offspring1.length, pop1);
    var survivors2 = toolbox.selectSurvivors(pop2.length - offspring2.length, pop2);
    var survivors3 = toolbox.selectSurvivors(pop3.length - offspring3.length, pop3);
    var survivors4 = toolbox.selectSurvivors(pop4.length - offspring4.length, pop4);

    var nextPop = offspring1.concat(survivors1);
    nextPop = nextPop.concat(offspring2.concat(survivors2));
    nextPop = nextPop.concat(offspring3.concat(survivors3));
    nextPop = nextPop.concat(offspring4.concat(survivors4));
    //what have I done

    if (hof !== undefined) {
      hof.update(nextPop);
    }

    return nextPop;
  }
};
