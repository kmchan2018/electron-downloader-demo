

import { Repository, Update } from './repository';


//////////////////////////////////////////////////////////////////////////
//
// Statistics tracks the number of tasks in a repository in various
// states.
//
//////////////////////////////////////////////////////////////////////////

interface Statistics {
	readonly total: number;
	readonly submitted: number;
	readonly paused: number;
	readonly completed: number;
	readonly cancelled: number;
}


//////////////////////////////////////////////////////////////////////////
//
// Derive the current statistics from the given repository.
//
//////////////////////////////////////////////////////////////////////////

function statistics(repository: Repository): Statistics {
	let total = 0;
	let submitted = 0;
	let paused = 0;
	let completed = 0;
	let cancelled = 0;

	for (const id in repository) {
		const task = repository[id];
		const state = task.state;

		if (state == 'submitted') {
			total = total + 1;
			submitted = submitted + 1;
		} else if (state == 'paused') {
			total = total + 1;
			paused = paused + 1;
		} else if (state == 'completed') {
			total = total + 1;
			completed = completed + 1;
		} else if (state == 'cancelled') {
			total = total + 1;
			cancelled = cancelled + 1;
		}
	}

	return { total, submitted, paused, completed, cancelled };
}


//////////////////////////////////////////////////////////////////////////
//
// Apply the given repository update to the given statistics and return
// the updated statistics.
//
//////////////////////////////////////////////////////////////////////////

function apply(statistics: Statistics, update: Update): Statistics {
	if (update.type == 'create_task_update') {
		return { ...statistics, total: statistics.total + 1, submitted: statistics.submitted + 1 };
	} else if (update.type == 'pause_task_update') {
		return { ...statistics, submitted: statistics.submitted - 1, paused: statistics.paused + 1 };
	} else if (update.type == 'resume_task_update') {
		return { ...statistics, submitted: statistics.submitted + 1, paused: statistics.paused - 1 };
	} else if (update.type == 'cancel_submitted_task_update') {
		return { ...statistics, submitted: statistics.submitted - 1, cancelled: statistics.cancelled + 1 };
	} else if (update.type == 'cancel_paused_task_update') {
		return { ...statistics, paused: statistics.paused - 1, cancelled: statistics.cancelled + 1 };
	} else if (update.type == 'complete_submitted_task_update') {
		return { ...statistics, submitted: statistics.submitted - 1, completed: statistics.completed + 1 };
	} else if (update.type == 'complete_paused_task_update') {
		return { ...statistics, paused: statistics.paused - 1, completed: statistics.completed + 1 };
	} else if (update.type == 'restart_task_update') {
		return { ...statistics, submitted: statistics.submitted + 1, completed: statistics.completed - 1 };
	} else {
		return statistics;
	}
}


//////////////////////////////////////////////////////////////////////////
//
// Exports.
//
//////////////////////////////////////////////////////////////////////////

export {
	Statistics,
	statistics,
	apply
}


