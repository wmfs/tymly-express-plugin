'use strict'

module.exports = class Eating {
  run (event, context) {
    console.log('EATING!!!!', context.executionName)
    event.petDiary.push(`Shh, ${event.petName} is eating...`)
    context.sendTaskSuccess(
      {
        hoursSinceLastMeal: 0,
        petDiary: event.petDiary
      }
    )
  }
}
