const Event = require('../models/Event');
const AppError = require('../utils/AppError');
const { removeImg } = require('../utils/fsManipulations');

/**
 * get all the events can pass pagination
 * options offset and limit via query.
 */
exports.getEvents = async (req, res) => {
  const { offset, limit } = req.query;
  const projectParams = { subQuery: true, include: 'tags' };

  // checking for pagination query options
  if (offset) projectParams.offset = offset;
  if (limit) projectParams.limit = limit;

  const events = await Event.findAll(projectParams);

  res.send(events);
};

/**
 * get event by passing the primary key via the param id.
 */
exports.getEvent = async (req, res) => {
  const event = await Event.findByPk(req.params.id, { raw: true });
  // validate if event exists
  if (!event) {
    throw new AppError('The event with the given ID was not found.', 404);
  }
  res.send(event);
};

/**
 * delete event by passing the primary key via the param id
 */
exports.deleteEvent = async (req, res) => {
  // find a single user with the id
  const event = await Event.findByPk(req.params.id);
  // validate dev profiles existence in the database
  if (!event) throw new AppError('The event with the given ID was not found.', 404);

  // delete the current event
  removeImg(event.image);
  await event.destroy();
  // send status if successes
  res.sendStatus(204);
};

exports.validateEvent = (req, res, next) => {
  //  user input validation
  const { error } = Event.validateAll(req.body);
  if (error) throw new AppError(error.details[0].message, 400);
  next();
};

/**
 * create new event via request body
 */
exports.createEvent = async (req, res) => {
  const event = await Event.create(req.body, { include: 'tags' });
  res.status(201).send(event);
};

exports.updateEvent = async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  // check if the event exists
  if (!event) throw new AppError('The event with the given ID was not found.', 404);

  // remove the old image
  removeImg(event.image);
  await event.update(req.body);

  res.send(event);
};
