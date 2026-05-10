"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PipelineList } from "@/components/explore/pipeline-list";
import { PeopleList } from "@/components/explore/people-list";

export default function ExplorePage() {
  const [tab, setTab] = useState("pipeline");

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
        <Compass className="w-3.5 h-3.5" />
        Explore
      </div>
      <h1 className="text-[26px] font-semibold tracking-tight mb-1">Pipeline & People</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Deals ranked by AI priority. Contacts grouped by company.
      </p>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-0">
          <PipelineList />
        </TabsContent>
        <TabsContent value="people" className="mt-0">
          <PeopleList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
