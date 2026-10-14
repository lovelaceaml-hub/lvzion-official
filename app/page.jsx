"use client";
import { useEffect, useState } from "react";

const SLOTS = [
  ["one", "Space 01", "#3e6f58", "#e3eee5", "calendar"],
  ["two", "Space 02", "#547bb6", "#e8eef9", "book"],
  ["three", "Space 03", "#c37360", "#f7e7e0", "people"],
  ["four", "Space 04", "#a57d44", "#f4eddd", "list"],
  ["five", "Space 05", "#ae719b", "#f6e9f0", "heart"],
  ["six", "Space 06", "#8271b1", "#eee8fa", "spark"],
  ["seven", "Space 07", "#378a91", "#e2f0ed", "list"],
  ["eight", "Space 08", "#96735d", "#f2e9e3", "people"]
];
const roles = [["member","Member"],["unit","Unit leader"],["group","Group leader"],["pastoral","Pastoral Staff"],["admin","App administrator"]];
const paths = {
  home:<path d="m3 11 9-8 9 8v9H3zM9 21v-7h6v7"/>,
  grid:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  book:<><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v14"/></>,
  people:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m4-7a3 3 0 0 0-1-6m1 10a5 5 0 0 1 3 4"/></>,
  list:<><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 10h6m-6 4h6m-6 4h4"/></>,
  heart:<path d="M20.5 8c0 5-8.5 11.5-8.5 11.5S3.5 13 3.5 8¶»§q«^