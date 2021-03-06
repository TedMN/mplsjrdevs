import React, { Component } from 'react';
import Event from './Event';
import client from '../services/airtable';
import { Button, Collapse } from '@blueprintjs/core';
import moment from 'moment';
import _ from 'lodash';

class Events extends Component {
  state = {
    isCollapseOpen: false,
    events: [],
    presenters: [],
    isLoading: false,
    error: false
  };

  componentDidMount() {
    this.fetchEvents();
  }

  async fetchEvents() {
    this.setState({ isLoading: true });
    try {
      const eventRecords = await client.listEvents();
      if (!eventRecords) return this.setState({ error: true });

      const presenterRecords = await client.listPresenters();
      if (!presenterRecords) return this.setState({ error: true });

      const presentersById = presenterRecords.reduce((byId, rec) => {
        if (!rec) return byId;
        const { id, fields } = rec;
        if (!id) return byId;
        return { ...byId, [id]: fields };
      }, {});

      const events = eventRecords.map(e => {
        const { fields } = e;
        if (!fields.presenters) {
          return { ...fields };
        }
        const presenters = fields.presenters.map(pid => presentersById[pid]);
        return { ...fields, presenters };
      });

      this.setState({ events });
    } catch (e) {
      this.setState({ error: true });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  async fetchPresenters() {
    this.setState({ isLoading: true });
    try {
      const records = await client.listPresenters();
      if (!records) return this.setState({ error: true });
      const presenters = records.map(e => ({ ...e.fields }));

      this.setState({ presenters });
    } catch (e) {
      this.setState({ error: true });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  renderError() {
    return (
      <section id="events">
        <h2>Hang tight...</h2>
        <h3>We can't access the event schedule right now. Try again later.</h3>
      </section>
    );
  }
  renderLoading() {
    return (
      <section id="events">
        <h2>Loading events...</h2>
        <h3>Upcoming get-togethers arriving in three...two...one...</h3>
      </section>
    );
  }

  render() {
    const { loading, events, error } = this.state;
    if (loading) return this.renderLoading();
    if (error || !events) return this.renderError();
    // split past and upcoming events based on today's date
    let [pastEvents, upcomingEvents] = _.partition(events, event => {
      return moment(event.event_date)
        .startOf('day')
        .isBefore(moment().startOf('day'));
    });

    // next event
    let nextEvent =
      upcomingEvents.length > 0 &&
      _.orderBy(upcomingEvents, 'event_date', 'asc')[0];

    // only show three most recent events by default
    pastEvents = _.orderBy(pastEvents, 'event_date', 'desc');
    let recentEvents = pastEvents.slice(0, 3);
    let moreEvents = pastEvents.slice(3);

    return (
      <section id="events">
        <h2>Events</h2>
        <h3>Upcoming</h3>
        {nextEvent ? (
          <Event
            key={nextEvent.event_date}
            showRegisterButton={true}
            {...nextEvent}
          />
        ) : (
          <div>No upcoming events :(</div>
        )}
        <h3>Past Events</h3>
        {!_.isEmpty(recentEvents) ? (
          recentEvents.map(event => {
            return <Event key={event.event_date} {...event} />;
          })
        ) : (
          <div>No past events :(</div>
        )}
        {!_.isEmpty(moreEvents) && (
          <div className="more-events">
            <Collapse isOpen={this.state.isCollapseOpen}>
              {moreEvents.map(event => {
                return <Event key={event.event_date} {...event} />;
              })}
            </Collapse>
            <Button
              onClick={this.handleCollapseClick}
              className="show-events-button button"
            >
              {this.state.isCollapseOpen ? 'Hide' : 'Show'} More Events
            </Button>
          </div>
        )}
      </section>
    );
  }

  handleCollapseClick = () => {
    this.setState({
      ...this.state,
      isCollapseOpen: !this.state.isCollapseOpen
    });
  };
}

export default Events;
