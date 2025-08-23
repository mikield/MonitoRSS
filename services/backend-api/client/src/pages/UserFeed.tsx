import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  Badge,
  IconButton,
  Alert,
  AlertDescription,
  MenuDivider,
  Wrap,
  AlertTitle,
  Box,
  AlertIcon,
  Tooltip,
  SimpleGrid,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverBody,
} from "@chakra-ui/react";
import { useParams, Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AddIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  DeleteIcon,
  ExternalLinkIcon,
  QuestionOutlineIcon,
} from "@chakra-ui/icons";
import { useContext, useEffect, useRef, useState } from "react";
import { FaBackward, FaGear, FaPause, FaUserSlash } from "react-icons/fa6";
import { FaCopy } from "react-icons/fa";
import { IoDuplicate } from "react-icons/io5";
import { BoxConstrained, CategoryText, ConfirmModal } from "@/components";
import {
  CloneUserFeedDialog,
  EditUserFeedDialog,
  UpdateUserFeedInput,
  useArticleDailyLimit,
  useCreateUserFeedLegacyRestore,
  useDeleteUserFeed,
  UserFeedDisabledAlert,
  UserFeedDisabledCode,
  useUpdateUserFeed,
  useUpdateUserFeedManagementInviteStatus,
  useUserFeed,
} from "../features/feed";
import RouteParams from "../types/RouteParams";
import { DashboardContentV2 } from "../components/DashboardContentV2";
import {
  AddConnectionDialog,
  ComparisonsTabSection,
  UserFeedMiscSettingsTabSection,
  ConnectionCard,
} from "../features/feedConnections";

import { UserFeedManagerStatus, pages } from "../constants";
import { UserFeedLogs } from "../features/feed/components/UserFeedLogs";
import { useUserMe } from "../features/discordUser";
import { PricingDialogContext } from "../contexts";
import { FeedConnectionDisabledCode } from "../types";
import { formatRefreshRateSeconds } from "../utils/formatRefreshRateSeconds";
import { ExternalPropertiesTabSection } from "../features/feedConnections/components/ExternalPropertiesTabSection";
import { UserFeedProvider, useUserFeedContext } from "../contexts/UserFeedContext";
import { UserFeedTabSearchParam } from "../constants/userFeedTabSearchParam";
import { UserFeedHealthAlert } from "../features/feed/components/UserFeedHealthAlert";
import { CopyUserFeedSettingsDialog } from "../features/feed/components/CopyUserFeedSettingsDialog";
import {
  PageAlertContextOutlet,
  PageAlertProvider,
  usePageAlertContext,
} from "../contexts/PageAlertContext";
import { TabContentContainer } from "../components/TabContentContainer";

const tabIndexBySearchParam = new Map<string, number>([
  [UserFeedTabSearchParam.Connections, 0],
  [UserFeedTabSearchParam.Comparisons, 1],
  [UserFeedTabSearchParam.ExternalProperties, 2],
  [UserFeedTabSearchParam.Settings, 3],
  [UserFeedTabSearchParam.Logs, 4],
]);

const tabLabelsByIndex = new Map<number, string>([
  [0, "Connections"],
  [1, "Comparisons"],
  [2, "External Properties"],
  [3, "Settings"],
  [4, "Logs"],
]);

export const UserFeed = () => {
  const { feedId } = useParams<RouteParams>();
  const { status, error } = useUserFeed({
    feedId,
  });

  return (
    <DashboardContentV2 error={error} loading={status === "loading"}>
      <UserFeedProvider feedId={feedId}>
        <Box display="flex" flexDirection="column" alignItems="center" pt={4} isolation="isolate">
          <PageAlertProvider>
            <UserFeedInner />
          </PageAlertProvider>
        </Box>
      </UserFeedProvider>
    </DashboardContentV2>
  );
};

const UserFeedInner: React.FC = () => {
  const { feedId } = useParams<RouteParams>();
  const { isOpen: editIsOpen, onClose: editOnClose, onOpen: editOnOpen } = useDisclosure();
  const {
    isOpen: copySettingsIsOpen,
    onClose: copySettingsOnClose,
    onOpen: copySettingsOnOpen,
  } = useDisclosure();
  const { onOpen: onOpenPricingDialog } = useContext(PricingDialogContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { search: urlSearch, state } = useLocation();
  const { isOpen, onClose, onOpen } = useDisclosure();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [addConnectionType, setAddConnectionType] = useState<
    { type: "discord-channel" | "discord-forum" | "discord-webhook" } | undefined
  >(undefined);
  const { data: dailyLimit } = useArticleDailyLimit({
    feedId,
  });
  const { userFeed: feed } = useUserFeedContext();
  const { data: userMe } = useUserMe();
  const feedTitle = feed?.title;
  const {
    mutateAsync: mutateAsyncUserFeed,
    status: updatingStatus,
    error: updateError,
    reset: resetUpdateError,
  } = useUpdateUserFeed();

  const {
    mutateAsync,
    status: deleteingStatus,
    error: deleteError,
    reset: resetDeleteError,
  } = useDeleteUserFeed();
  const { mutateAsync: restoreLegacyFeed } = useCreateUserFeedLegacyRestore();
  const { mutateAsync: updateInvite } = useUpdateUserFeedManagementInviteStatus();
  const isSharedWithMe = !!feed?.sharedAccessDetails?.inviteId;
  const isNewFeed = state?.isNewFeed as boolean | undefined;

  const { createSuccessAlert, createErrorAlert } = usePageAlertContext();

  const onAddConnection = (type: "discord-channel" | "discord-webhook" | "discord-forum") => {
    setAddConnectionType({ type });
    onOpen();
  };

  useEffect(() => {
    if (isNewFeed) {
      createSuccessAlert({
        title: "Successfully added feed.",
        description: " Add connections to specify where articles should be sent to.",
      });
    }
  }, [isNewFeed]);

  useEffect(() => {
    if (feedTitle) {
      document.title = `${feedTitle} | MonitoRSS`;
    }
  }, [feedTitle]);

  const isAtLimit = dailyLimit ? dailyLimit.current >= dailyLimit.max : false;

  const onDeleteFeed = async () => {
    if (!feedId) {
      return;
    }

    await mutateAsync({
      feedId,
    });
    navigate(pages.userFeeds(), {
      state: {
        alertTitle: `Successfully deleted feed: ${feed.title}`,
      },
    });
  };

  const onUpdateFeed = async ({ url, ...rest }: UpdateUserFeedInput["data"]) => {
    if (!feedId) {
      return;
    }

    await mutateAsyncUserFeed({
      feedId,
      data: {
        url: url === feed?.url ? undefined : url,
        ...rest,
      },
    });
    createSuccessAlert({
      title: "Successfully updated feed.",
    });
  };

  const onRestoreLegacyFeed = async () => {
    if (!feedId) {
      return;
    }

    try {
      await restoreLegacyFeed({
        feedId,
      });
      navigate("/servers");
    } catch (err) {
      createErrorAlert({
        title: "Failed to restore legacy feed.",
        description: (err as Error).message,
      });
    }
  };

  const onRemoveMyAccess = async () => {
    if (!feed?.sharedAccessDetails?.inviteId) {
      return;
    }

    try {
      await updateInvite({
        id: feed.sharedAccessDetails?.inviteId,
        data: {
          status: UserFeedManagerStatus.Declined,
        },
      });

      navigate(pages.userFeeds(), {
        state: {
          alertTitle: `Successfully removed shared access to feed: ${feed.title}`,
        },
      });
    } catch (err) {
      createErrorAlert({
        title: "Failed to remove shared access.",
        description: (err as Error).message,
      });
    }
  };

  const addConnectionButtons = isSharedWithMe ? null : (
    <Flex gap={4} flexWrap="wrap">
      <Button
        variant="outline"
        onClick={() => onAddConnection("discord-channel")}
        leftIcon={<AddIcon fontSize="sm" />}
      >
        Add Discord channel
      </Button>
      <Button
        variant="outline"
        onClick={() => onAddConnection("discord-forum")}
        leftIcon={<AddIcon fontSize="sm" />}
      >
        Add Discord forum
      </Button>
      <Button
        variant="outline"
        onClick={() => onAddConnection("discord-webhook")}
        leftIcon={<AddIcon fontSize="sm" />}
      >
        Add Discord webhook
      </Button>
    </Flex>
  );

  const disabledConnections = feed?.connections.filter(
    (c) => c.disabledCode === FeedConnectionDisabledCode.Manual
  );

  const tabIndex = tabIndexBySearchParam.get(urlSearch);

  const urlIsDifferentFromInput = feed?.inputUrl && feed?.url !== feed?.inputUrl;

  return (
    <>
      <PageAlertContextOutlet
        containerProps={{
          maxW: "1400px",
          w: "100%",
          display: "flex",
          justifyContent: "center",
          px: [4, 4, 8, 12],
          pt: 0,
          pb: 4,
        }}
      />
      <Tabs isLazy isFitted defaultIndex={tabIndex ?? 0} index={tabIndex ?? undefined} width="100%">
        <AddConnectionDialog isOpen={isOpen} type={addConnectionType?.type} onClose={onClose} />
        <EditUserFeedDialog
          onCloseRef={menuButtonRef}
          isOpen={editIsOpen}
          onClose={() => {
            editOnClose();
            resetUpdateError();
          }}
          defaultValues={{
            title: feed?.title as string,
            url: feed?.url as string,
          }}
          onUpdate={onUpdateFeed}
          error={updateError?.message}
        />
        <CopyUserFeedSettingsDialog
          isOpen={copySettingsIsOpen}
          onClose={copySettingsOnClose}
          onCloseRef={menuButtonRef}
          feedId={feedId}
        />
        <Stack width="100%" minWidth="100%" alignItems="center">
          <Stack maxWidth="1400px" width="100%" paddingX={{ base: 4, md: 8, lg: 12 }} spacing={4}>
            <Stack spacing={6}>
              <Stack spacing={4}>
                <Stack flex={1}>
                  <Breadcrumb>
                    <BreadcrumbItem>
                      <BreadcrumbLink as={RouterLink} to={pages.userFeeds()} color="blue.300">
                        Feeds
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        as={RouterLink}
                        to={pages.userFeed(feed.id, {
                          tab: UserFeedTabSearchParam.Connections,
                        })}
                        color="blue.300"
                      >
                        {feed?.title}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbItem isCurrentPage>
                      <BreadcrumbLink>
                        {tabLabelsByIndex.get(tabIndex || 0) ?? "Connections"}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </Breadcrumb>
                  <Stack flex={1}>
                    <HStack
                      alignItems="flex-start"
                      justifyContent="space-between"
                      flexWrap="wrap"
                      gap={3}
                    >
                      <Stack width="fit-content">
                        <Flex alignItems="center" gap={0}>
                          <Heading as="h1" size="lg" marginRight={4} tabIndex={-1}>
                            {feed?.title}
                          </Heading>
                          {feed && feed?.sharedAccessDetails?.inviteId && (
                            <Tooltip
                              label={`This feed is shared with you by someone else, and currently counts towards your feed
                            limit. You can remove your access through the Actions dropdown.`}
                            >
                              <Badge>Shared</Badge>
                            </Tooltip>
                          )}
                        </Flex>
                      </Stack>
                      <Menu>
                        <MenuButton
                          as={Button}
                          variant="outline"
                          ref={menuButtonRef}
                          rightIcon={<ChevronDownIcon />}
                        >
                          <span>Feed Actions</span>
                        </MenuButton>
                        <MenuList>
                          <MenuItem aria-label="Edit" onClick={editOnOpen} icon={<FaGear />}>
                            {t("common.buttons.configure")}
                          </MenuItem>
                          <MenuItem onClick={copySettingsOnOpen} icon={<FaCopy />}>
                            Copy settings to...
                          </MenuItem>
                          {feed && (
                            <CloneUserFeedDialog
                              trigger={
                                <MenuItem icon={<IoDuplicate />}>
                                  <span>Clone</span>
                                </MenuItem>
                              }
                              defaultValues={{
                                title: feed.title,
                                url: feed.url,
                              }}
                              feedId={feed.id}
                            />
                          )}
                          {feed?.sharedAccessDetails?.inviteId && (
                            <ConfirmModal
                              title="Remove my shared access"
                              description="Are you sure you want to remove your access to this feed? You will no longer be able to view or manage this feed."
                              trigger={
                                <MenuItem
                                  isDisabled={updatingStatus === "loading"}
                                  icon={<FaUserSlash />}
                                >
                                  <span>Remove my shared access</span>
                                </MenuItem>
                              }
                              okText={t("common.buttons.yes")}
                              colorScheme="red"
                              onConfirm={onRemoveMyAccess}
                              onClosed={resetUpdateError}
                              error={updateError?.message}
                            />
                          )}
                          {feed && feed.disabledCode !== UserFeedDisabledCode.Manual && (
                            <ConfirmModal
                              title={t("pages.userFeed.disableFeedConfirmTitle")}
                              description={t("pages.userFeed.disableFeedConfirmDescription")}
                              trigger={
                                <MenuItem
                                  isDisabled={updatingStatus === "loading"}
                                  icon={<FaPause />}
                                >
                                  <span>{t("pages.userFeed.disableFeedButtonText")}</span>
                                </MenuItem>
                              }
                              okText="Disable feed"
                              colorScheme="blue"
                              onConfirm={async () =>
                                onUpdateFeed({
                                  disabledCode: UserFeedDisabledCode.Manual,
                                })
                              }
                              onClosed={resetUpdateError}
                              error={updateError?.message}
                            />
                          )}
                          <MenuDivider />
                          {feed?.isLegacyFeed && feed.allowLegacyReversion && (
                            <ConfirmModal
                              title="Restore legacy feed"
                              size="xl"
                              descriptionNode={
                                <Stack>
                                  <Text fontWeight={800} color="red.300">
                                    Only proceed if absolutely required!
                                  </Text>
                                  <Stack>
                                    <Text>
                                      If you are currently facing issues with converting to personal
                                      feeds, you may convert this feed back to a legacy feed until a
                                      fix is applied.
                                    </Text>
                                    <Text>
                                      Legacy feeds are still permanently disabled. If you are facing
                                      issues, please reach out to Support for remediation so that
                                      you can convert this back to a personal feed as soon as
                                      possible.
                                    </Text>
                                    <Text>
                                      After this feed has been restored, this personal feed will be
                                      deleted.
                                    </Text>
                                    <Wrap mt={4}>
                                      <Button
                                        as={Link}
                                        href="https://discord.gg/pudv7Rx"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="ghost"
                                      >
                                        Discord Support Server
                                      </Button>
                                      <Button
                                        as={Link}
                                        href="https://support.monitorss.xyz"
                                        target="_blank"
                                        variant="ghost"
                                      >
                                        File a Support ticket
                                      </Button>
                                    </Wrap>
                                  </Stack>
                                </Stack>
                              }
                              onConfirm={onRestoreLegacyFeed}
                              colorScheme="red"
                              okText="Restore legacy feed"
                              trigger={
                                <MenuItem icon={<FaBackward />}>Restore legacy feed</MenuItem>
                              }
                            />
                          )}
                          {feedId && (
                            <ConfirmModal
                              title={t("pages.userFeed.deleteConfirmTitle")}
                              description={t("pages.userFeed.deleteConfirmDescription")}
                              trigger={
                                <MenuItem
                                  isDisabled={deleteingStatus === "loading"}
                                  icon={<DeleteIcon color="red.200" />}
                                >
                                  <Text color="red.200">{t("common.buttons.delete")}</Text>
                                </MenuItem>
                              }
                              okText={t("pages.userFeed.deleteConfirmOk")}
                              colorScheme="red"
                              onConfirm={onDeleteFeed}
                              error={deleteError?.message}
                              onClosed={resetDeleteError}
                            />
                          )}
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Stack>
                </Stack>
                <UserFeedHealthAlert />
                <UserFeedDisabledAlert />
              </Stack>
              <TabContentContainer>
                <Stack spacing={6}>
                  <Heading as="h2" size="md">
                    Feed Overview
                  </Heading>
                  <CategoryText title="Feed Link">
                    <Stack spacing={1}>
                      <Link
                        href={feed?.inputUrl || feed?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        wordBreak="break-all"
                        color="blue.300"
                        display="flex"
                        alignItems="center"
                        gap={2}
                      >
                        {feed?.inputUrl || feed?.url} <ExternalLinkIcon />
                      </Link>
                      {urlIsDifferentFromInput && (
                        <Flex alignItems="center">
                          <Text color="whiteAlpha.600" fontSize="sm" display="inline">
                            Resolved to{" "}
                            <Link
                              color="whiteAlpha.600"
                              href={feed?.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              fontSize="sm"
                              wordBreak="break-all"
                            >
                              {feed?.url}
                            </Link>
                          </Text>
                          <Popover>
                            <PopoverTrigger>
                              <Button
                                variant="ghost"
                                size="xs"
                                aria-label="What is cache duration?"
                              >
                                <QuestionOutlineIcon
                                  fontSize={12}
                                  tabIndex={-1}
                                  ml={2}
                                  aria-hidden
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent>
                              <PopoverArrow />
                              <PopoverCloseButton />
                              <PopoverBody>
                                <Text>
                                  The feed link that is actually being used since the original link
                                  was not a valid RSS feed feed.
                                </Text>
                              </PopoverBody>
                            </PopoverContent>
                          </Popover>
                        </Flex>
                      )}
                    </Stack>
                  </CategoryText>
                  <Grid
                    templateColumns={{
                      base: "1fr",
                      sm: "repeat(2, 1fr)",
                      lg: "repeat(4, fit-content(320px))",
                    }}
                    columnGap="20"
                    rowGap={{ base: "8", lg: "14" }}
                    as="ul"
                  >
                    <CategoryText title={t("pages.feed.refreshRateLabel")}>
                      {feed
                        ? formatRefreshRateSeconds(
                            feed.userRefreshRateSeconds || feed.refreshRateSeconds
                          )
                        : null}
                    </CategoryText>
                    <CategoryText title={t("pages.feed.createdAtLabel")}>
                      {feed?.createdAt}
                    </CategoryText>
                    <CategoryText
                      title={t("pages.feed.articleDailyLimit")}
                      helpTooltip={{
                        description: t("pages.feed.articleDailyLimitHint"),
                        buttonLabel: "What is article daily limit?",
                      }}
                    >
                      <HStack>
                        <Text color={isAtLimit ? "red.300" : ""} display="block">
                          {dailyLimit && `${dailyLimit.current}/${dailyLimit.max}`}
                        </Text>
                        {dailyLimit && !userMe?.result.enableBilling && (
                          <IconButton
                            as="a"
                            href="https://www.patreon.com/monitorss"
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label="Increase article daily limit"
                            variant="ghost"
                            icon={<ArrowLeftIcon />}
                            size="xs"
                            transform="rotate(90deg)"
                          />
                        )}
                        {dailyLimit && userMe?.result.enableBilling && (
                          <IconButton
                            aria-label="Increase article daily limit"
                            variant="ghost"
                            icon={<ArrowLeftIcon />}
                            size="xs"
                            transform="rotate(90deg)"
                            onClick={onOpenPricingDialog}
                          />
                        )}
                        {!dailyLimit && <Spinner display="block" size="sm" />}
                      </HStack>
                    </CategoryText>
                  </Grid>
                </Stack>
              </TabContentContainer>
            </Stack>
            <Box overflow="auto" display="flex">
              <TabList w="max-content" flex={1}>
                <Tab
                  fontWeight={tabIndex === 0 ? "bold" : "semibold"}
                  onClick={() =>
                    navigate({
                      search: UserFeedTabSearchParam.Connections,
                    })
                  }
                >
                  {t("pages.userFeeds.tabConnections")}
                </Tab>
                <Tab
                  fontWeight={tabIndex === 1 ? "bold" : "semibold"}
                  onClick={() =>
                    navigate({
                      search: UserFeedTabSearchParam.Comparisons,
                    })
                  }
                >
                  {t("pages.userFeeds.tabComparisons")}
                </Tab>
                <Tab
                  fontWeight={tabIndex === 2 ? "bold" : "semibold"}
                  onClick={() =>
                    navigate({
                      search: UserFeedTabSearchParam.ExternalProperties,
                    })
                  }
                >
                  External Properties
                </Tab>
                <Tab
                  fontWeight={tabIndex === 3 ? "bold" : "semibold"}
                  onClick={() =>
                    navigate({
                      search: UserFeedTabSearchParam.Settings,
                    })
                  }
                >
                  {t("pages.userFeeds.settings")}
                </Tab>
                <Tab
                  fontWeight={tabIndex === 4 ? "bold" : "semibold"}
                  onClick={() =>
                    navigate({
                      search: UserFeedTabSearchParam.Logs,
                    })
                  }
                >
                  {t("pages.userFeeds.tabLogs")}
                </Tab>
              </TabList>
            </Box>
          </Stack>
        </Stack>
        <TabPanels width="100%" display="flex" justifyContent="center">
          <TabPanel padding={0} py={4} width="100%">
            {/**
             * https://github.com/chakra-ui/chakra-ui/issues/5636
             * There is a bug with Chakra where the connection card settings dropdown will cause
             * an overflow scroll on the tab panel.
             */}
            <BoxConstrained.Wrapper overflow="visible">
              <BoxConstrained.Container>
                <TabContentContainer>
                  <Stack spacing={6} mb={16}>
                    <Stack spacing={3}>
                      <Flex
                        justifyContent="space-between"
                        alignItems="flex-start"
                        flexWrap="wrap"
                        gap={4}
                      >
                        <Heading size="md" as="h2">
                          {t("pages.userFeeds.tabConnections")}
                        </Heading>
                        <Menu placement="bottom-end">
                          <MenuButton
                            colorScheme="blue"
                            as={Button}
                            rightIcon={<ChevronDownIcon />}
                          >
                            Add new connection
                          </MenuButton>
                          <MenuList maxWidth="300px">
                            <MenuItem onClick={() => onAddConnection("discord-channel")}>
                              <Stack spacing={1}>
                                <Text>Discord Channel</Text>
                                <Text fontSize={13} color="whiteAlpha.600">
                                  Send articles as messages authored by the bot to a Discord
                                  channel.
                                </Text>
                              </Stack>
                            </MenuItem>
                            <MenuItem onClick={() => onAddConnection("discord-forum")}>
                              <Stack spacing={1}>
                                <Text>Discord Forum</Text>
                                <Text fontSize={13} color="whiteAlpha.600" whiteSpace="normal">
                                  Send articles as messages authored by the bot to a Discord forum.
                                </Text>
                              </Stack>
                            </MenuItem>
                            <MenuItem onClick={() => onAddConnection("discord-webhook")}>
                              <Stack spacing={1}>
                                <Text>{t("pages.feed.discordWebhookMenuItem")}</Text>
                                <Text fontSize={13} color="whiteAlpha.600">
                                  Send articles as messages authored by a webhook with a custom name
                                  and avatar to a Discord channel.
                                </Text>
                              </Stack>
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                      <Text>{t("pages.feed.connectionSectionDescription")}</Text>
                    </Stack>
                    {feed && !feed.connections.length && !isSharedWithMe && (
                      <Stack>
                        <Alert status="warning" rounded="md">
                          <AlertIcon />
                          <Box>
                            <AlertTitle>You have no connections set up!</AlertTitle>
                            <AlertDescription>
                              <Stack>
                                <Text>
                                  You&apos;ll need to set up at least one connection to tell the bot
                                  where to send new articles!
                                </Text>
                                {addConnectionButtons}
                              </Stack>
                            </AlertDescription>
                          </Box>
                        </Alert>
                      </Stack>
                    )}
                    {feed?.connections.length && (
                      <SimpleGrid
                        spacing={4}
                        templateColumns={[
                          "repeat(auto-fill, minmax(225px, 1fr))",
                          "repeat(auto-fill, minmax(320px, 1fr))",
                        ]}
                      >
                        {feed?.connections
                          ?.filter((c) => c.disabledCode !== FeedConnectionDisabledCode.Manual)
                          ?.map((connection) => {
                            return (
                              <ConnectionCard
                                key={connection.id}
                                connection={connection}
                                feedId={feedId as string}
                              />
                            );
                          })}
                      </SimpleGrid>
                    )}
                    {disabledConnections?.length ? (
                      <Stack spacing={4} mt={2}>
                        <Heading size="sm" as="h3" fontWeight={600} color="whiteAlpha.800">
                          Disabled Connections
                        </Heading>
                        <SimpleGrid
                          spacing={4}
                          templateColumns={[
                            "repeat(auto-fill, minmax(225px, 1fr))",
                            "repeat(auto-fill, minmax(320px, 1fr))",
                          ]}
                        >
                          {disabledConnections?.map((connection) => {
                            return (
                              <ConnectionCard
                                key={connection.id}
                                connection={connection}
                                feedId={feedId as string}
                              />
                            );
                          })}
                        </SimpleGrid>
                      </Stack>
                    ) : null}
                    {feed?.connections.length && addConnectionButtons}
                  </Stack>
                </TabContentContainer>
              </BoxConstrained.Container>
            </BoxConstrained.Wrapper>
          </TabPanel>
          <TabPanel padding={0} py={4} width="100%" tabIndex={-1}>
            <BoxConstrained.Wrapper>
              <BoxConstrained.Container>
                <TabContentContainer>
                  <ComparisonsTabSection
                    passingComparisons={feed?.passingComparisons}
                    blockingComparisons={feed?.blockingComparisons}
                    updateError={updateError?.message}
                    onUpdate={({ passingComparisons, blockingComparisons }) =>
                      onUpdateFeed({
                        passingComparisons,
                        blockingComparisons,
                      })
                    }
                  />
                </TabContentContainer>
              </BoxConstrained.Container>
            </BoxConstrained.Wrapper>
          </TabPanel>
          <TabPanel padding={0} py={4} width="100%">
            <BoxConstrained.Wrapper>
              <BoxConstrained.Container>
                <TabContentContainer>
                  <ExternalPropertiesTabSection />
                </TabContentContainer>
              </BoxConstrained.Container>
            </BoxConstrained.Wrapper>
          </TabPanel>
          <TabPanel padding={0} py={4} width="100%">
            <BoxConstrained.Wrapper>
              <BoxConstrained.Container>
                <TabContentContainer>
                  <UserFeedMiscSettingsTabSection feedId={feedId as string} />
                </TabContentContainer>
              </BoxConstrained.Container>
            </BoxConstrained.Wrapper>
          </TabPanel>
          <TabPanel padding={0} py={4} width="100%">
            <BoxConstrained.Wrapper>
              <BoxConstrained.Container>
                <TabContentContainer>
                  <UserFeedLogs />
                </TabContentContainer>
              </BoxConstrained.Container>
            </BoxConstrained.Wrapper>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
};
