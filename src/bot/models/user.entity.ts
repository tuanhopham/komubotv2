import { text } from "stream/consumers";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { TABLE } from "../constants/table";
import { WorkFromHome } from "./wfh.entity";

@Entity(TABLE.USER)
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text", nullable: true, unique: true })
  userId: string;

  @Column({ type: "text", nullable: true })
  username: string;

  @OneToMany(() => WorkFromHome, (state) => state.userid)
  wfh: WorkFromHome;

  @Column({ type: "text", nullable: true })
  discriminator: string;

  @Column({ type: "text", nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bot: boolean;

  @Column({ nullable: true })
  system: boolean;

  @Column({ nullable: true })
  mfa_enabled: boolean;

  @Column({ type: "text", nullable: true })
  banner: string;

  @Column({ type: "text", nullable: true })
  accent_color: string;

  @Column({ type: "text", nullable: true })
  locale: string;

  @Column({ nullable: true })
  verified: boolean;

  @Column({ type: "text", nullable: true })
  email: string;

  @Column({ nullable: true })
  flags: number;

  @Column({ nullable: true })
  premium_type: number;

  @Column({ nullable: true })
  public_flags: number;

  @Column({ type: "text", nullable: true })
  last_message_id: string;

  @Column({ type: "text", nullable: true })
  last_mentioned_message_id: string;

  @Column({ default: 0 })
  scores_quiz: number;

  @Column({ type: "text", array: true, nullable: true })
  roles: string[];

  @Column({ nullable: true })
  pending_wfh: boolean;

  @Column({ type: "text", nullable: true })
  last_bot_message_id: string;

  @Column({ nullable: true })
  deactive: boolean;

  @Column({ type: "text", array: true, nullable: true })
  roles_discord: string[];

  @Column({ default: false })
  botPing: boolean;
}
