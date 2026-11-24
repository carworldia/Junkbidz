import Link from "next/link";
import { TruckIcon } from "@/components/Icons";
import { JOB_STATUS, itemsLabel, loadLabel, pickupLabel } from "@/lib/junk";
import type { Job } from "@/lib/types";

// One of the customer's jobs in a list, with how many quotes it has.
export default function JobCard({ job, quotes, waiting, hired }: {
  job: Pick<Job, "id" | "title" | "status" | "item_types" | "load_size" | "photos" | "pickup_date" | "pickup_window" | "created_at">;
  quotes: number; waiting: number; hired?: string | null;
}) {
  return (
    <Link href={`/jobs/${job.id}`} className={`card job-card jk-job${waiting > 0 ? " unread" : ""}`}>
      <div className="jk-thumb">{job.photos[0] ? <img src={job.photos[0]} alt="" /> : <TruckIcon />}</div>
      <div className="jk-body">
        <div className="job-top">
          <strong>{job.title}</strong>
          <span className={`badge st-${job.status}`}>{JOB_STATUS[job.status]}</span>
        </div>
        <div className="mute">{itemsLabel(job.item_types)} · {loadLabel(job.load_size)}</div>
        <div className="mute">{pickupLabel(job.pickup_date, job.pickup_window)}</div>
        {hired && <div className="job-accepted">{hired}</div>}
        <ul className="job-chips">
          <li><strong>{quotes}</strong> {quotes === 1 ? "quote" : "quotes"}</li>
          {waiting > 0 && <li className="hot"><strong>{waiting}</strong> waiting on you</li>}
        </ul>
      </div>
    </Link>
  );
}
